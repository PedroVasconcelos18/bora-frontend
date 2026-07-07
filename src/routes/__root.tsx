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

// sessionStorage key used to persist invite tokens across the auth redirect (Pitfall 4)
const PENDING_INVITE_KEY = 'pendingInviteToken';

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
const PUBLIC_ROUTES = ['/login', '/signup', '/invites'];

function AppWithAuth() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { user, setUser, clearUser } = useAuthStore();

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

    if (data?.user) {
      setUser(data.user);

      // After successful auth, check for a pending invite token and resume the accept flow.
      // The token was saved by /invites/$token before redirecting to /signup or /login (Pitfall 4).
      const pendingToken = sessionStorage.getItem(PENDING_INVITE_KEY);
      if (pendingToken) {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        void navigate({ to: '/invites/$token', params: { token: pendingToken } });
      }
    } else {
      clearUser();
      const currentPath = routerState.location.pathname;
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
            sessionStorage.setItem(PENDING_INVITE_KEY, inviteToken);
          }
        }
        void navigate({ to: '/login' });
      }
    }
  }, [data, isLoading, setUser, clearUser, navigate, routerState.location.pathname]);

  // During initial auth check, render nothing (or a minimal shell)
  // to avoid flash of unauthenticated content on protected routes
  if (isLoading) {
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

  return (
    <div className="device">
      {user && <AppBar />}
      <Outlet />
      {user && <TabBar />}
      <ToastContainer />
    </div>
  );
}

