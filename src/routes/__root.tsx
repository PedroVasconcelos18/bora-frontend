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

// Public routes that do not require authentication
const PUBLIC_ROUTES = ['/login', '/signup'];

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
    } else {
      clearUser();
      const currentPath = routerState.location.pathname;
      const isPublic = PUBLIC_ROUTES.some((r) => currentPath.startsWith(r));
      if (!isPublic) {
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
    </div>
  );
}

function AppBar() {
  const { user, clearUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.delete('/auth/logout');
    } catch {
      // Ignore errors — clear client state regardless
    }
    clearUser();
    void navigate({ to: '/login' });
  };

  if (!user) return null;

  // Get initials for the avatar
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className="appbar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(250,247,240,0.9)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: '1.4rem',
          color: 'var(--green-ink)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 8,
            background: 'var(--green-bright)',
            display: 'grid',
            placeItems: 'center',
            transform: 'rotate(-6deg)',
            fontSize: '0.95rem',
          }}
        >
          ↑
        </span>
        Bora
      </div>

      {/* User + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--green-bright)',
            color: 'var(--green-ink)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '0.85rem',
          }}
        >
          {initials}
        </span>
        <button
          onClick={() => void handleLogout()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            padding: 6,
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--coral)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
