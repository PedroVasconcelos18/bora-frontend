import { useNavigate, useRouterState } from '@tanstack/react-router';

/**
 * TabBar — sticky bottom navigation following referencia.html .tabbar.
 * Background: var(--card), border-top: 1px solid var(--line)
 * Safe area: padding-bottom max(8px, env(safe-area-inset-bottom))
 * FAB "+ Criar": inner span 40×40 border-radius 13px background var(--green-bright)
 */
export function TabBar() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        background: 'var(--card)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        padding: 'max(8px, env(safe-area-inset-bottom))',
        paddingTop: 8,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Desafios tab */}
      <button
        onClick={() => void navigate({ to: '/home' })}
        style={{
          flex: 1,
          background: pathname === '/home' ? 'var(--mint)' : 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          color: pathname === '/home' ? 'var(--green-ink)' : 'var(--muted)',
          fontWeight: 700,
          fontSize: '0.72rem',
          transition: 'color 0.15s, background 0.15s',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>🏠</span>
        Desafios
      </button>

      {/* FAB "+ Criar" */}
      <button
        onClick={() => void navigate({ to: '/challenges/new' })}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          color: 'var(--green-ink)',
          fontWeight: 700,
          fontSize: '0.72rem',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            background: 'var(--green-bright)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: '1.3rem',
          }}
        >
          +
        </span>
        Criar
      </button>

      {/* Perfil tab */}
      <button
        onClick={() => void navigate({ to: '/profile' })}
        style={{
          flex: 1,
          background: isActive('/profile') ? 'var(--mint)' : 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          color: isActive('/profile') ? 'var(--green-ink)' : 'var(--muted)',
          fontWeight: 700,
          fontSize: '0.72rem',
          transition: 'color 0.15s, background 0.15s',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>😎</span>
        Perfil
      </button>
    </nav>
  );
}
