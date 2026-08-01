/**
 * push-state.test.ts — DOM-free vitest for lib/push.ts (mirrors
 * sao-paulo-day.test.ts's plain describe/it/expect convention: this repo
 * has no jsdom environment and no testing-library, so only PURE functions
 * are testable here).
 *
 * Covers: the `urlBase64ToUint8Array` VAPID key conversion, and the full
 * `derivePushCardState` truth table (Discretion #4's intersection rule,
 * D-05/D-06's one-shot permission prompt, Discretion #2's iOS install gate).
 */

import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array, derivePushCardState, type DerivePushCardStateInput } from '../src/lib/push';

// A real VAPID public key fixture (Phase 11's actual, permanent public key —
// D-12, non-secret). 65 raw bytes once decoded (uncompressed EC point: 0x04
// prefix + 32-byte X + 32-byte Y).
const REAL_VAPID_KEY =
  'BCecQ7lZlHsItIQDRonWQ34cz4vCoA-VgSD038y8qO3unkA6uMOw9mJGXxmE-H_8Kh2q9x_csSJr_2W96QOPWso';

describe('urlBase64ToUint8Array', () => {
  it('converts a real VAPID public key into a 65-byte array', () => {
    const bytes = urlBase64ToUint8Array(REAL_VAPID_KEY);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(0x04); // uncompressed EC point marker
  });

  it('maps url-safe characters back to standard base64 and pads correctly for every length mod 4', () => {
    // length % 4 === 0 — no padding needed
    expect(() => urlBase64ToUint8Array('AAAA')).not.toThrow();
    expect(urlBase64ToUint8Array('AAAA').length).toBe(3);

    // length % 4 === 2 — needs '==' padding
    expect(() => urlBase64ToUint8Array('AA')).not.toThrow();
    expect(urlBase64ToUint8Array('AA').length).toBe(1);

    // length % 4 === 3 — needs '=' padding
    expect(() => urlBase64ToUint8Array('AAA')).not.toThrow();
    expect(urlBase64ToUint8Array('AAA').length).toBe(2);

    // url-safe chars '-' and '_' must map to '+' and '/' respectively
    const dashUnderscore = urlBase64ToUint8Array('--__');
    const plusSlash = urlBase64ToUint8Array('++//');
    expect(Array.from(dashUnderscore)).toEqual(Array.from(plusSlash));
  });
});

describe('derivePushCardState', () => {
  // Baseline: fully "off" — nothing subscribed, nothing denied, not iOS, supported.
  const base: DerivePushCardStateInput = {
    isChecking: false,
    permission: 'default',
    browserSubscribed: false,
    serverHasEndpoint: false,
    serverEnabled: false,
    isSupported: true,
    isIOS: false,
    isStandalone: false,
  };

  it('returns reconciling while the check is in flight, regardless of every other input', () => {
    expect(derivePushCardState({ ...base, isChecking: true })).toBe('reconciling');
    expect(
      derivePushCardState({
        ...base,
        isChecking: true,
        permission: 'denied',
        browserSubscribed: true,
        serverHasEndpoint: true,
        serverEnabled: true,
      }),
    ).toBe('reconciling');
    expect(derivePushCardState({ ...base, isChecking: true, isSupported: false })).toBe('reconciling');
  });

  it('returns denied whenever permission is denied, even if a subscription still exists', () => {
    expect(
      derivePushCardState({
        ...base,
        permission: 'denied',
        browserSubscribed: true,
        serverHasEndpoint: true,
        serverEnabled: true,
      }),
    ).toBe('denied');
  });

  it('returns on only when browser subscription AND server endpoint AND server preference are all true', () => {
    expect(
      derivePushCardState({ ...base, browserSubscribed: true, serverHasEndpoint: true, serverEnabled: true }),
    ).toBe('on');

    // Any single leg missing must NOT produce 'on'.
    expect(
      derivePushCardState({ ...base, browserSubscribed: false, serverHasEndpoint: true, serverEnabled: true }),
    ).not.toBe('on');
    expect(
      derivePushCardState({ ...base, browserSubscribed: true, serverHasEndpoint: false, serverEnabled: true }),
    ).not.toBe('on');
    expect(
      derivePushCardState({ ...base, browserSubscribed: true, serverHasEndpoint: true, serverEnabled: false }),
    ).not.toBe('on');
  });

  it('returns off when the server holds the endpoint but the browser subscription is gone', () => {
    expect(
      derivePushCardState({ ...base, browserSubscribed: false, serverHasEndpoint: true, serverEnabled: true }),
    ).toBe('off');
  });

  it('returns off when the browser has a subscription the server does not know', () => {
    expect(
      derivePushCardState({ ...base, browserSubscribed: true, serverHasEndpoint: false, serverEnabled: false }),
    ).toBe('off');
  });

  it('returns ios-not-installed on iOS outside standalone display when not already on', () => {
    expect(derivePushCardState({ ...base, isIOS: true, isStandalone: false })).toBe('ios-not-installed');
    // Even when the underlying Push API probe reports unsupported (common on
    // pre-install iOS Safari), the iOS-specific state takes precedence.
    expect(derivePushCardState({ ...base, isIOS: true, isStandalone: false, isSupported: false })).toBe(
      'ios-not-installed',
    );
  });

  it('returns on (not ios-not-installed) on an installed iOS PWA that is already subscribed', () => {
    expect(
      derivePushCardState({
        ...base,
        isIOS: true,
        isStandalone: true,
        browserSubscribed: true,
        serverHasEndpoint: true,
        serverEnabled: true,
      }),
    ).toBe('on');
  });

  it('returns unsupported when push is unavailable on a non-iOS browser', () => {
    expect(derivePushCardState({ ...base, isSupported: false, isIOS: false })).toBe('unsupported');
  });

  it('returns off on a fully-supported, non-iOS browser with nothing activated', () => {
    expect(derivePushCardState(base)).toBe('off');
  });
});
