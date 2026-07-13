/**
 * auth-guard.test.ts — DOM-free unit test for lib/authGuard.ts (07-06).
 *
 * Pure functions, no imports from React/router.
 */

import { describe, it, expect } from 'vitest';
import { isPublicRoute, resolveGuardRedirect, shouldRenderChrome } from '../src/lib/authGuard';

describe('isPublicRoute (07-06)', () => {
  it('is true for public routes', () => {
    expect(isPublicRoute('/login')).toBe(true);
    expect(isPublicRoute('/signup')).toBe(true);
    expect(isPublicRoute('/invites/abc123')).toBe(true);
    expect(isPublicRoute('/admin')).toBe(true);
  });

  it('is false for protected routes', () => {
    expect(isPublicRoute('/home')).toBe(false);
    expect(isPublicRoute('/profile')).toBe(false);
    expect(isPublicRoute('/challenges/xyz')).toBe(false);
    expect(isPublicRoute('/challenges/new')).toBe(false);
  });
});

describe('resolveGuardRedirect (07-06)', () => {
  it('GAP-3: never redirects before the store has settled (status loading)', () => {
    expect(
      resolveGuardRedirect({ status: 'loading', user: null, pathname: '/home' })
    ).toBeNull();
  });

  it('redirects a settled logged-out user off a protected route', () => {
    expect(
      resolveGuardRedirect({ status: 'ready', user: null, pathname: '/home' })
    ).toBe('/login');
  });

  it('does not redirect a settled logged-out user off a public route', () => {
    expect(
      resolveGuardRedirect({ status: 'ready', user: null, pathname: '/invites/abc123' })
    ).toBeNull();
  });

  it('does not redirect an authenticated user off a protected route', () => {
    expect(
      resolveGuardRedirect({
        status: 'ready',
        user: { id: '1' },
        pathname: '/home',
      })
    ).toBeNull();
  });

  it('TRAP (a) REGRESSION LOCK: does not bounce an authenticated user off /login', () => {
    expect(
      resolveGuardRedirect({
        status: 'ready',
        user: { id: '1' },
        pathname: '/login',
      })
    ).toBeNull();
  });
});

describe('shouldRenderChrome (07-07)', () => {
  it('renders chrome for an authenticated user on ordinary protected routes', () => {
    expect(shouldRenderChrome('/home', true)).toBe(true);
    expect(shouldRenderChrome('/challenges/abc', true)).toBe(true);
    expect(shouldRenderChrome('/profile', true)).toBe(true);
  });

  it('GAP-4: renders bare for an authenticated invitee on /invites', () => {
    expect(shouldRenderChrome('/invites/abc123', true)).toBe(false);
  });

  it('renders bare for a logged-out visitor on /invites', () => {
    expect(shouldRenderChrome('/invites/abc123', false)).toBe(false);
  });

  it('D-02: /admin is always bare, even for an authenticated operator', () => {
    // /admin is gated by an env secret (AdminGuard), not by a user session —
    // the console must be the same object at any width and any session, so
    // it stays in BARE_WHEN_AUTHED regardless of whether the operator
    // happens to also have a logged-in app-user session.
    expect(shouldRenderChrome('/admin', true)).toBe(false);
  });

  it('renders bare for a logged-out operator on /admin (secret-entry screen)', () => {
    expect(shouldRenderChrome('/admin', false)).toBe(false);
  });

  it('renders bare for a logged-out visitor on /login', () => {
    expect(shouldRenderChrome('/login', false)).toBe(false);
  });
});
