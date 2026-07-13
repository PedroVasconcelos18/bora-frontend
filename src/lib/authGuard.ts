/**
 * authGuard.ts — pure, dependency-free route-policy module (07-06).
 *
 * WHY THIS EXISTS:
 *   __root.tsx's guard used to branch on the never-invalidated ['auth-me']
 *   query cache while re-running on every navigation (pathname in the dep
 *   array) — reversing the auth transition that caused the navigation
 *   (UAT gaps 1/2). This module extracts the route policy into pure
 *   functions with no React/router imports, so the policy itself is
 *   unit-testable independent of effect timing (see test/auth-guard.test.ts).
 *
 * NO REACT, NO ROUTER IMPORTS — keep this file runtime-pure so it stays
 * trivially testable in the existing DOM-free vitest setup.
 */
import type { AuthUser, AuthStatus } from '../stores/auth.store';

// Public routes that do not require authentication.
// '/invites' is included so a logged-out invitee reaches the invite screen
// before any guard redirect (GAP 2 fix — startsWith matching covers /invites/$token).
// '/admin' is included because it is gated by a distinct env-configured secret
// (AdminGuard) checked over an X-Admin-Secret header, NOT the user JWT
// session — an operator who is not (or cannot be) logged in as an app user
// must still reach the secret-entry screen instead of being bounced to
// /login (Rule 2 — missing critical functionality, since /admin's whole
// point is to be usable independent of any user session). Because the gate
// is a secret and not a session, /admin is ALSO in BARE_WHEN_AUTHED below
// (D-02, Fase 10): the console must look identical whether or not the
// operator happens to also have a logged-in app-user session.
export const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/invites',
  '/admin',
  '/forgot-password',
  '/reset-password',
];

export type { AuthStatus };

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

// Routes that stay chrome-free even for a signed-in visitor (07-07, UAT gap 4).
// '/login' and '/signup' are never durably occupied by an authenticated visitor
// either — their own effects (login.tsx/signup.tsx) bounce an authed visitor
// away on mount. '/invites' is where an authenticated visitor legitimately
// sits on a public page (accepting an invite while already logged in,
// correct-email or wrong-email state). The two password-recovery routes
// (Fase 8, D-18) qualify for the same reason: a signed-in visitor who opens a
// reset link (another tab, an old e-mail link) must still see the bare card,
// never WebShell/AppBar+TabBar chrome around it.
// '/admin' (D-02, Fase 10): the console's operator is authenticated by an env
// secret (AdminGuard), NOT by a user JWT session — rendering the app user's
// sidebar (Início/Desafios/Notificações/Perfil) inside an operator console
// would offer navigation into an app the operator may not even have an
// account for, and would make the SAME /admin route look different purely
// based on whether the operator happens to also hold a logged-in app-user
// session. Fase 5 originally left '/admin' OUT of this list on purpose,
// flagging that omission as "TRAP (b)" — a signed-in operator's sidebar was
// deliberately preserved. Fase 10 inverts that call: /admin now belongs here
// so the console is the same bare object at any width and any session, and
// brings its own header instead (D-03).
export const BARE_WHEN_AUTHED = ['/invites', '/forgot-password', '/reset-password', '/admin'];

/**
 * shouldRenderChrome — the chrome-render policy (07-07, UAT gap 4).
 *
 * The chrome decision must be driven by route PUBLICNESS, not by `user`
 * truthiness alone. A logged-out visitor never gets chrome (today's
 * behaviour, preserved). A logged-in visitor gets chrome EXCEPT on the
 * narrow BARE_WHEN_AUTHED list (currently just '/invites').
 */
export function shouldRenderChrome(pathname: string, isAuthed: boolean): boolean {
  if (!isAuthed) return false;
  if (BARE_WHEN_AUTHED.some((route) => pathname.startsWith(route))) return false;
  return true;
}

export interface GuardInput {
  status: AuthStatus;
  user: Pick<AuthUser, 'id'> | null;
  pathname: string;
}

/**
 * resolveGuardRedirect — the single guard authority's decision function.
 *
 * Returns '/login' when a non-public route is visited without a settled,
 * authenticated user; returns null otherwise (including while status is
 * 'loading' — GAP-3: NEVER redirect before the store has settled, otherwise
 * a valid deep-link is bounced by a phantom-null user).
 *
 * Deliberately does NOT redirect an authenticated user away from a public
 * route (e.g. away from /login). That decision belongs to login.tsx /
 * signup.tsx, which pair it with the pending-invite consume (TRAP (a)).
 * Encoding it here would make root a second consumer of a destructive
 * token, reintroducing the exact race commit dd571f2 fixed. Do not
 * "helpfully" add that case here.
 */
export function resolveGuardRedirect(input: GuardInput): '/login' | null {
  const { status, user, pathname } = input;

  if (status === 'loading') return null;
  if (user) return null;
  if (isPublicRoute(pathname)) return null;

  return '/login';
}
