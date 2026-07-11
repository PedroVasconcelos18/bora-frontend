import {
  createRootRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore, AuthUser } from '../stores/auth.store';
import { TabBar } from '../components/TabBar';
import { ToastContainer } from '../components/Toast';
import { AppBar } from '../components/AppBar';
import { WebShell } from '../components/WebShell';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../lib/breakpoints';
import { consumePendingInvite, savePendingInvite } from '../lib/pendingInvite';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWithAuth />
    </QueryClientProvider>
  );
}

// Public routes that do not require authentication.
// '/invites' is included so a logged-out invitee reaches the invite screen
// before any guard redirect (GAP 2 fix — startsWith matching covers /invites/$token).
// '/admin' is included because it is gated by a distinct env-configured secret
// (AdminGuard, D-11) rather than the user JWT session — an operator who is not
// (or cannot be) logged in as an app user must still reach the secret-entry
// screen instead of being bounced to /login (Rule 2 — missing critical
// functionality, since /admin's whole point is to be usable independent of
// any user session).
const PUBLIC_ROUTES = ['/login', '/signup', '/invites', '/admin'];

function AppWithAuth() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { user, setUser, clearUser } = useAuthStore();
  // D-13: structural mobile<->web tree switch, computed at the top of the
  // component (before any conditional return) per the rules of hooks. Covers
  // both the isLoading branch and the main return below.
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  // Boot-time session hydration — GET /auth/me with credentials
  // 200 → setUser (stay on current route)
  // 401 → clearUser + redirect to /login if on a protected route
  const { data, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      if (res.ok) {
        return (await res.json()) as { user: AuthUser };
      }
      return null;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (isLoading) return;

    const currentPath = routerState.location.pathname;

    if (data?.user) {
      setUser(data.user);

      // After successful auth, check for a pending invite token and resume the accept flow.
      // The token was saved by /invites/$token before redirecting to /signup or /login (Pitfall 4).
      // Guard: skip this boot-time resume on /login and /signup — those pages now own
      // post-auth navigation themselves (GAP 2 fix), so resuming here too would race /
      // double-navigate against their own consumePendingInvite() call.
      const onAuthPage = currentPath.startsWith('/login') || currentPath.startsWith('/signup');
      if (!onAuthPage) {
        const pendingToken = consumePendingInvite();
        if (pendingToken) {
          void navigate({ to: '/invites/$token', params: { token: pendingToken } });
        }
      }
    } else {
      clearUser();
      const isPublic = PUBLIC_ROUTES.some((r) => currentPath.startsWith(r));
      if (!isPublic) {
        // Defensive stash: if the guard would redirect a logged-out user away from an
        // /invites path, save the token first so it survives the auth redirect (GAP 2 / Pitfall 4).
        // '/invites' is now public so this normally won't fire for invite paths, but belt-and-
        // suspenders: any future guard change cannot silently lose the invite token.
        // pathname.split('/') for '/invites/$token' → ['', 'invites', '$token'] → index [2] = token.
        // A bare '/invites' (no token segment) yields undefined at [2] → stash nothing.
        if (currentPath.startsWith('/invites')) {
          const inviteToken = currentPath.split('/')[2];
          if (inviteToken) {
            savePendingInvite(inviteToken);
          }
        }
        void navigate({ to: '/login' });
      }
    }
  }, [data, isLoading, setUser, clearUser, navigate, routerState.location.pathname]);

  // During initial auth check, render nothing (or a minimal shell)
  // to avoid flash of unauthenticated content on protected routes
  if (isLoading) {
    if (isWeb) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 32,
              height: 32,
              border: '3px solid var(--mint-deep)',
              borderTopColor: 'var(--green)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      );
    }
    return (
      <div className="device">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 32,
              height: 32,
              border: '3px solid var(--mint-deep)',
              borderTopColor: 'var(--green)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      </div>
    );
  }

  if (isWeb) {
    return (
      <>
        {user && <WebShell />}
        {!user && <Outlet />}
      </>
    );
  }

  return (
    <div className="device">
      {user && <AppBar />}
      <Outlet />
      {user && <TabBar />}
      <ToastContainer />
    </div>
  );
}

