/**
 * pix-charge-cache.test.ts — Phase 07 plan 11 (UAT gap 7)
 *
 * Pins the two pure pieces that make the autopay mount idempotent:
 *
 *  1. `resolveChargeRequest` — the SINGLE source of truth for which endpoint a
 *     charge targets. The invite accept path is used ONLY while the token is
 *     present AND has not been consumed; once consumed every subsequent charge
 *     must go through the participant charge path, never the now-dead token.
 *
 *  2. `readCachedCharge` / `writeCachedCharge` — the durable per-token charge
 *     cache. The backend never persists the QR (see 07-11 PLAN, FACT 2), so
 *     after a remount this cache is the ONLY way to put the invitee's live
 *     charge back on screen without minting a second Mercado Pago charge
 *     (FACT 1: `createCashIn` is NOT idempotent).
 *
 * Runs in vitest's default NODE environment — there is no DOM and no global
 * session storage here, which is exactly why every helper takes an injectable
 * store and tolerates its absence.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveChargeRequest,
  readCachedCharge,
  writeCachedCharge,
  pixChargeCacheKey,
  type ChargeResult,
} from '../src/components/PixPaymentCore';

// --- fake in-memory Storage double -----------------------------------------

function makeStore(seed: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

const CHARGE: ChargeResult = {
  qrCode: '00020126580014BR.GOV.BCB.PIX',
  qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
  ticketUrl: 'https://mp.example/ticket/1',
  expiresAt: '2026-07-12T23:59:00.000Z',
  paymentId: 'pay_1',
  participantId: 'part_1',
  challengeId: 'chal_1',
};

// --- resolveChargeRequest ----------------------------------------------------

describe('resolveChargeRequest', () => {
  it('token present and not spent -> invite accept-and-pay path, body without challengeId', () => {
    const { path, body } = resolveChargeRequest({
      token: 'tok_abc',
      challengeId: 'chal_1',
      tokenSpent: false,
      pixKey: 'me@x.com',
    });
    expect(path).toBe('/invites/tok_abc/accept-and-pay');
    expect(body).toEqual({ pixKey: 'me@x.com' });
    expect(body).not.toHaveProperty('challengeId');
  });

  it('token present but ALREADY SPENT -> participant charge path with challengeId', () => {
    const { path, body } = resolveChargeRequest({
      token: 'tok_abc',
      challengeId: 'chal_1',
      tokenSpent: true,
      pixKey: 'me@x.com',
    });
    expect(path).toBe('/participants/me/pay');
    expect(body).toEqual({ challengeId: 'chal_1', pixKey: 'me@x.com' });
  });

  it('no token -> participant charge path with challengeId', () => {
    const { path, body } = resolveChargeRequest({
      challengeId: 'chal_1',
      tokenSpent: false,
      pixKey: 'me@x.com',
    });
    expect(path).toBe('/participants/me/pay');
    expect(body).toEqual({ challengeId: 'chal_1', pixKey: 'me@x.com' });
  });

  it('empty-string or undefined pixKey serialises as undefined (preserves `key || undefined`)', () => {
    const empty = resolveChargeRequest({ token: 'tok_abc', tokenSpent: false, pixKey: '' });
    expect(empty.body.pixKey).toBeUndefined();

    const missing = resolveChargeRequest({ challengeId: 'chal_1', tokenSpent: false });
    expect(missing.body.pixKey).toBeUndefined();
    expect(missing.body.challengeId).toBe('chal_1');
  });
});

// --- durable per-token charge cache -----------------------------------------

describe('pix charge cache', () => {
  it('round-trips: write then read with the same token + userId returns the charge', () => {
    const store = makeStore();
    writeCachedCharge('tok_abc', 'user_1', CHARGE, store);
    expect(readCachedCharge('tok_abc', 'user_1', store)).toEqual(CHARGE);
    // the key is namespaced by token
    expect(store.getItem(pixChargeCacheKey('tok_abc'))).toBeTruthy();
  });

  it('userId mismatch -> null (never hands one user another user\'s charge)', () => {
    const store = makeStore();
    writeCachedCharge('tok_abc', 'user_1', CHARGE, store);
    expect(readCachedCharge('tok_abc', 'user_2', store)).toBeNull();
  });

  it('unknown token -> null', () => {
    const store = makeStore();
    writeCachedCharge('tok_abc', 'user_1', CHARGE, store);
    expect(readCachedCharge('tok_zzz', 'user_1', store)).toBeNull();
  });

  it('corrupt / non-JSON stored value -> null, does not throw', () => {
    const store = makeStore({ [pixChargeCacheKey('tok_abc')]: '{not json' });
    expect(() => readCachedCharge('tok_abc', 'user_1', store)).not.toThrow();
    expect(readCachedCharge('tok_abc', 'user_1', store)).toBeNull();

    const shapeless = makeStore({ [pixChargeCacheKey('tok_abc')]: '{"userId":"user_1"}' });
    expect(readCachedCharge('tok_abc', 'user_1', shapeless)).toBeNull();
  });

  it('no store (null) -> read returns null, write is a silent no-op, neither throws', () => {
    expect(() => writeCachedCharge('tok_abc', 'user_1', CHARGE, null)).not.toThrow();
    expect(readCachedCharge('tok_abc', 'user_1', null)).toBeNull();
  });

  it('a throwing store (Safari private mode / quota) never propagates', () => {
    const hostile = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    expect(() => writeCachedCharge('tok_abc', 'user_1', CHARGE, hostile)).not.toThrow();
    expect(readCachedCharge('tok_abc', 'user_1', hostile)).toBeNull();
  });
});
