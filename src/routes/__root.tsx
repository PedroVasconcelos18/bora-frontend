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
import { savePendingInvite } from '../lib/pendingInvite';
import { resolveGuardRedirect } from '../lib/authGuard';

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

function AppWithAuth() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { user, status, setUser, clearUser } = useAuthStore();
  // D-13: structural mobile<->web tree switch, computed at the top of the
  // component (before any conditional return) per the rules of hooks. Covers
  // both the isLoading branch and the main return below.
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  // Boot-time session hydration — GET /auth/me with credentials
  // 200 → setUser (stay on current route)
  // 401 → clearUser
  // This query is DEMOTED to a boot hydration source only (07-06) — it is
  // never invalidated/refetched, so the zustand store (not `data`) is the
  // guard's source of truth below.
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

  // HYDRATION effect (07-06) — pure boot hydration, NEVER navigates and NEVER
  // touches the invite token. Deps deliberately exclude
  // routerState.location.pathname: that dep is precisely what made every
  // navigation re-run this effect against a frozen boot snapshot and reverse
  // the auth transition that caused it (UAT gaps 1/2). login.tsx/signup.tsx
  // remain the sole consumers of the pending-invite token (TRAP (a)) — this
  // effect must not import/reference consumePendingInvite.
  useEffect(() => {
    if (isLoading) return;

    if (data?.user) {
      setUser(data.user);
    } else {
      clearUser();
    }
  }, [data, isLoading, setUser, clearUser]);

  // GUARD effect (07-06) — the store (`user`/`status`), not the query cache,
  // is the single guard authority. Driven by resolveGuardRedirect (pure
  // policy module) so the guard's decision is unit-tested independent of
  // this effect's timing.
  useEffect(() => {
    const currentPath = routerState.location.pathname;
    const redirect = resolveGuardRedirect({ status, user, pathname: currentPath });

    if (redirect) {
      // Defensive stash: if the guard would redirect a logged-out user away from an
      // /invites path, save the token first so it survives the auth redirect (GAP 2 / Pitfall 4).
      // '/invites' is public so this normally won't fire for invite paths, but belt-and-
      // suspenders: any future guard change cannot silently lose the invite token.
      // pathname.split('/') for '/invites/$token' → ['', 'invites', '$token'] → index [2] = token.
      // A bare '/invites' (no token segment) yields undefined at [2] → stash nothing.
      if (currentPath.startsWith('/invites')) {
        const inviteToken = currentPath.split('/')[2];
        if (inviteToken) {
          savePendingInvite(inviteToken);
        }
      }
      void navigate({ to: redirect });
    }
  }, [user, status, routerState.location.pathname, navigate]);

  // During initial auth check (store not yet settled), render nothing (or a
  // minimal shell) to avoid flash of unauthenticated content on protected
  // routes. Gated on the STORE's status (07-06 GAP-3 fix), not the query's
  // isLoading — the store flag does not re-show the spinner when the cache
  // is cleared on logout, and it closes the phantom-null-user window where
  // protected children mounted with user===null before the store caught up.
  if (status === 'loading') {
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

