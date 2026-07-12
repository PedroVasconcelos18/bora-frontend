/**
 * auth-store.test.ts — DOM-free unit test for stores/auth.store.ts (07-06).
 *
 * Drives the store through useAuthStore.getState()/setState(), never
 * renders — same style as test/pending-invite.test.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../src/stores/auth.store';

describe('auth.store (07-06 readiness flag)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'loading' });
  });

  it('initial state: user is null and status is loading', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.status).toBe('loading');
  });

  it('setUser(u) sets user to u and status to ready', () => {
    const u = { id: '1', email: 'a@b.com', name: 'A' };
    useAuthStore.getState().setUser(u);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(u);
    expect(state.status).toBe('ready');
  });

  it('clearUser() sets user to null and status to ready', () => {
    const u = { id: '1', email: 'a@b.com', name: 'A' };
    useAuthStore.getState().setUser(u);
    useAuthStore.getState().clearUser();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.status).toBe('ready');
  });

  it('clearUser() from the initial loading state still flips status to ready (boot-time-401 path)', () => {
    useAuthStore.getState().clearUser();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.status).toBe('ready');
  });
});
