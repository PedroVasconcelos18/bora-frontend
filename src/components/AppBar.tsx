import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../stores/auth.store';
import { useLogout } from '../hooks/useLogout';
import { useUnreadCount } from '../hooks/useUnreadCount';

/**
 * AppBar — sticky top navigation following referencia.html .appbar.
 * Background: rgba(250,247,240,0.9) with backdrop-filter blur(8px)
 * Logo: Baloo 2 800 22px + spark mark (24x24 green-bright, rotate -6deg)
 * Right: bell (D-13, Fase 9) + user initials avatar + "Sair" logout button
 */
export function AppBar() {
  const { user } = useAuthStore();
  const handleLogout = useLogout();
  const navigate = useNavigate();
  // Hook called BEFORE the `!user` early return (regra dos hooks) — the
  // hook itself already gates its own query on `!!user` internally.
  const { data: unreadCount } = useUnreadCount();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
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

      {/* Bell (D-13) + user + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <button
          type="button"
          onClick={() => void navigate({ to: '/notifications' })}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label="Notificações"
        >
          <span style={{ fontSize: '1.1rem' }}>🔔</span>
          {!!unreadCount && unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                background: 'var(--coral)',
                color: 'var(--card)',
                borderRadius: 999,
                minWidth: 16,
                height: 16,
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.62rem',
                fontWeight: 800,
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
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
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
