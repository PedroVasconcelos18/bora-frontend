/**
 * pending-invite.test.ts — DOM-free unit test for lib/pendingInvite.ts (GAP 2)
 *
 * Injects a Map-backed fake storage object (no jsdom / sessionStorage needed)
 * and asserts the save/consume contract behaves correctly:
 *   - save-then-consume returns the token AND clears the key
 *   - a second consume returns null
 *   - consume on empty storage returns null
 */

import { describe, it, expect } from 'vitest';
import { savePendingInvite, consumePendingInvite, PENDING_INVITE_KEY } from '../src/lib/pendingInvite';

/** Minimal Map-backed fake implementing the Storage subset the helper needs. */
function createFakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    __map: map,
  };
}

describe('pendingInvite helper (GAP 2)', () => {
  it('save-then-consume returns the token and clears the key', () => {
    const storage = createFakeStorage();
    savePendingInvite('abc-123', storage);
    expect(storage.__map.get(PENDING_INVITE_KEY)).toBe('abc-123');

    const consumed = consumePendingInvite(storage);
    expect(consumed).toBe('abc-123');
    expect(storage.__map.has(PENDING_INVITE_KEY)).toBe(false);
  });

  it('a second consume returns null', () => {
    const storage = createFakeStorage();
    savePendingInvite('token-1', storage);
    consumePendingInvite(storage);

    const secondConsume = consumePendingInvite(storage);
    expect(secondConsume).toBeNull();
  });

  it('consume on empty storage returns null', () => {
    const storage = createFakeStorage();
    const consumed = consumePendingInvite(storage);
    expect(consumed).toBeNull();
  });
});
