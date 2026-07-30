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
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveChargeRequest,
  readCachedCharge,
  writeCachedCharge,
  pixChargeCacheKey,
  pixChargeChallengeCacheKey,
  readCachedChallengeCharge,
  writeCachedChallengeCharge,
  isChargeLive,
  resolveMountCharge,
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

// ---------------------------------------------------------------------------
// Debug session `cobrancas-pix-duplicadas`, item #5 — the challengeId path.
//
// The AUTHORITATIVE fix for duplicate Pix charges is in the backend
// (`createCashIn` now refuses a charge for a PAID participant and reuses a live
// PENDING row). What follows is defence in depth only: the mount effect used to
// hydrate from the session cache exclusively on the `token` path, so reopening
// the pay screen by `challengeId` always left a POST — pointless traffic, and
// before the backend guard, a real second charge.
//
// These tests pin the pure decision function the effect delegates to. The
// effect's ONLY branch that fires a request is `resolveMountCharge(...) === null`,
// so "returns a charge" IS "no POST leaves the browser". This repo has no DOM
// test environment (vitest runs in node, no @testing-library), which is why the
// decision lives in a pure function instead of inside the effect body.
// ---------------------------------------------------------------------------

const HOUR = 3_600_000;
const NOW = Date.parse('2026-07-30T12:00:00.000Z');

/** CHARGE with a controllable expiry, so no test depends on the wall clock. */
function chargeExpiringAt(iso: string): ChargeResult {
  return { ...CHARGE, expiresAt: iso };
}

const LIVE = chargeExpiringAt(new Date(NOW + 20 * 60_000).toISOString()); // +20 min
const DEAD = chargeExpiringAt(new Date(NOW - 1).toISOString()); // 1 ms past

describe('isChargeLive', () => {
  it('true strictly before expiry, false at and after it', () => {
    expect(isChargeLive(LIVE, NOW)).toBe(true);
    expect(isChargeLive(chargeExpiringAt(new Date(NOW).toISOString()), NOW)).toBe(false);
    expect(isChargeLive(DEAD, NOW)).toBe(false);
  });

  it('unparseable expiresAt counts as NOT live (fall through, never park on a dead QR)', () => {
    expect(isChargeLive(chargeExpiringAt('not-a-date'), NOW)).toBe(false);
    expect(isChargeLive(chargeExpiringAt(''), NOW)).toBe(false);
  });
});

describe('challenge-keyed charge cache', () => {
  it('round-trips a live charge under the challenge key', () => {
    const store = makeStore();
    writeCachedChallengeCharge('chal_1', 'user_1', LIVE, store);
    expect(readCachedChallengeCharge('chal_1', 'user_1', store, NOW)).toEqual(LIVE);
    expect(store.getItem(pixChargeChallengeCacheKey('chal_1'))).toBeTruthy();
  });

  it('EXPIRED entry -> null, so the caller requests a fresh charge', () => {
    const store = makeStore();
    writeCachedChallengeCharge('chal_1', 'user_1', DEAD, store);
    expect(readCachedChallengeCharge('chal_1', 'user_1', store, NOW)).toBeNull();
    // ...and the very same entry WAS usable while it was still live
    expect(readCachedChallengeCharge('chal_1', 'user_1', store, NOW - HOUR)).toEqual(DEAD);
  });

  it('userId mismatch -> null (a shared tab never leaks one user\'s QR to another)', () => {
    const store = makeStore();
    writeCachedChallengeCharge('chal_1', 'user_1', LIVE, store);
    expect(readCachedChallengeCharge('chal_1', 'user_2', store, NOW)).toBeNull();
  });

  it('a different challenge -> null (entries never bleed across challenges)', () => {
    const store = makeStore();
    writeCachedChallengeCharge('chal_1', 'user_1', LIVE, store);
    expect(readCachedChallengeCharge('chal_2', 'user_1', store, NOW)).toBeNull();
  });

  it('challenge keys can NEVER collide with token keys, for any token value', () => {
    // The prefixes diverge one character after `bora.pix-charge` (`.` vs `-`),
    // so even a token deliberately crafted to look like a challenge key misses.
    expect(pixChargeCacheKey('challenge.chal_1')).not.toBe(pixChargeChallengeCacheKey('chal_1'));

    const store = makeStore();
    writeCachedCharge('challenge.chal_1', 'user_1', LIVE, store);
    expect(readCachedChallengeCharge('chal_1', 'user_1', store, NOW)).toBeNull();

    writeCachedChallengeCharge('chal_1', 'user_1', LIVE, store);
    expect(store.length).toBe(2); // two distinct slots, not one overwritten
  });

  it('no store / hostile store -> null, never throws', () => {
    expect(() => writeCachedChallengeCharge('chal_1', 'user_1', LIVE, null)).not.toThrow();
    expect(readCachedChallengeCharge('chal_1', 'user_1', null, NOW)).toBeNull();

    const hostile = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    expect(() => writeCachedChallengeCharge('chal_1', 'user_1', LIVE, hostile)).not.toThrow();
    expect(readCachedChallengeCharge('chal_1', 'user_1', hostile, NOW)).toBeNull();
  });
});

describe('resolveMountCharge — the mount decision (null === a request is sent)', () => {
  it('REMOUNT ON THE challengeId PATH DOES NOT RE-POST: a live cached charge is returned', () => {
    const store = makeStore();
    // first mount succeeded; onSuccess wrote the challenge-keyed entry
    writeCachedChallengeCharge('chal_1', 'user_1', LIVE, store);

    // second mount (Back→Forward, tab restore, overlay reopened) — same inputs
    const decision = resolveMountCharge({
      userId: 'user_1',
      challengeId: 'chal_1',
      store,
      now: NOW,
    });
    expect(decision).toEqual(LIVE);
    expect(decision).not.toBeNull(); // not-null is precisely "the effect returns early"
  });

  it('ABSENT cache on the challengeId path -> null, a fresh charge IS requested', () => {
    expect(
      resolveMountCharge({ userId: 'user_1', challengeId: 'chal_1', store: makeStore(), now: NOW }),
    ).toBeNull();
  });

  it('EXPIRED cache on the challengeId path -> null, a fresh charge IS requested', () => {
    const store = makeStore();
    writeCachedChallengeCharge('chal_1', 'user_1', DEAD, store);
    expect(
      resolveMountCharge({ userId: 'user_1', challengeId: 'chal_1', store, now: NOW }),
    ).toBeNull();
  });

  it('another user\'s cached charge is never handed over -> null, fresh charge requested', () => {
    const store = makeStore();
    writeCachedChallengeCharge('chal_1', 'user_1', LIVE, store);
    expect(
      resolveMountCharge({ userId: 'user_2', challengeId: 'chal_1', store, now: NOW }),
    ).toBeNull();
  });

  it('the token entry wins when both exist (it is what this invite flow wrote)', () => {
    const store = makeStore();
    const viaToken = { ...LIVE, paymentId: 'pay_token' };
    const viaChallenge = { ...LIVE, paymentId: 'pay_challenge' };
    writeCachedCharge('tok_abc', 'user_1', viaToken, store);
    writeCachedChallengeCharge('chal_1', 'user_1', viaChallenge, store);

    expect(
      resolveMountCharge({
        userId: 'user_1',
        token: 'tok_abc',
        challengeId: 'chal_1',
        store,
        now: NOW,
      }),
    ).toEqual(viaToken);
  });

  it('token MISS falls back to the challenge entry instead of re-POSTing a spent token', () => {
    const store = makeStore();
    writeCachedChallengeCharge('chal_1', 'user_1', LIVE, store);
    expect(
      resolveMountCharge({
        userId: 'user_1',
        token: 'tok_abc', // nothing was ever written under this token
        challengeId: 'chal_1',
        store,
        now: NOW,
      }),
    ).toEqual(LIVE);
  });

  it('an EXPIRED token entry is still returned — the asymmetry is deliberate', () => {
    // On the token path, falling through would re-POST accept-and-pay against a
    // consumed token: a 404 that paints "convite já usado" over a charge that
    // only needed regenerating. Keeping the expired QR on screen leaves the
    // regenerate button (which routes to the participant path) as the way out.
    const store = makeStore();
    writeCachedCharge('tok_abc', 'user_1', DEAD, store);
    expect(resolveMountCharge({ userId: 'user_1', token: 'tok_abc', store, now: NOW })).toEqual(
      DEAD,
    );
  });

  it('no store at all -> null (cache is an optimisation, never a hard dependency)', () => {
    expect(
      resolveMountCharge({ userId: 'user_1', challengeId: 'chal_1', store: null, now: NOW }),
    ).toBeNull();
  });

  it('neither token nor challengeId -> null', () => {
    expect(resolveMountCharge({ userId: 'user_1', store: makeStore(), now: NOW })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Wiring pin.
//
// Everything above tests pure functions, which stay green even if the hook
// stops calling them — and an unwired cache is an INERT fix, not a broken one,
// so nothing else would go red. There is no DOM test environment here to
// render the hook and observe the absent request, so this scans the source the
// way forbidden-vocab.test.ts does. It proves the call sites EXIST, not that
// they run; the behaviour they produce is argued in the hook's docblock.
// ---------------------------------------------------------------------------

describe('usePixPayment wiring (the cache is useless unless the hook calls it)', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components', 'PixPaymentCore.tsx'),
    'utf-8',
  );

  it('the mount effect delegates its decision to resolveMountCharge', () => {
    expect(source).toContain('const cached = resolveMountCharge({');
  });

  it('onSuccess writes the challenge-keyed entry, keyed off the RESPONSE challengeId', () => {
    expect(source).toContain('writeCachedChallengeCharge(data.challengeId, user.id, data)');
  });

  it('the mount effect has exactly ONE place that fires a charge request', () => {
    const fires = source.match(/chargeMutation\.mutate\(undefined\)/g) ?? [];
    expect(fires).toHaveLength(1);
  });
});
