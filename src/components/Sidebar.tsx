import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '../stores/auth.store';
import { useLogout } from '../hooks/useLogout';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { PrimaryButton } from './PrimaryButton';

/**
 * Sidebar — web nav (tablet + desktop, D-04) built entirely from ds-bundle
 * tokens. Replaces AppBar/TabBar from 768px up (WEB-02/WEB-04); those stay
 * mobile chrome, reference-only. Markup/values are design-confirmed from the
 * canvas "Bora Web.dc.html" (turn 1a Dashboard) — D-07..D-12, literal, not
 * rounded. Logout funnels through the shared useLogout() authority (07-06);
 * the active-route predicate copied verbatim from TabBar.tsx.
 */
export function Sidebar() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const handleLogout = useLogout();
  const { data: unreadCount } = useUnreadCount();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navRowBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 12px',
    borderRadius: 14,
    fontWeight: 700,
    fontSize: '0.95rem',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  } as const;

  return (
    <aside
      style={{
        width: 236,
        flexShrink: 0,
        background: 'var(--card)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: '1.7rem',
          color: 'var(--green-ink)',
        }}
      >
        Bora<span style={{ color: 'var(--green-bright)' }}>.</span>
      </div>

      {/* CTA — PrimaryButton reused, stretched to full-width via flex column wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20, marginBottom: 20 }}>
        <PrimaryButton onClick={() => void navigate({ to: '/challenges/new' })}>
          + Criar desafio
        </PrimaryButton>
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          type="button"
          onClick={() => void navigate({ to: '/home' })}
          style={{
            ...navRowBaseStyle,
            border: 'none',
            cursor: 'pointer',
            background: isActive('/home') ? 'var(--mint)' : 'none',
            color: isActive('/home') ? 'var(--green-ink)' : 'var(--muted)',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            if (!isActive('/home')) e.currentTarget.style.background = 'var(--paper)';
          }}
          onMouseLeave={(e) => {
            if (!isActive('/home')) e.currentTarget.style.background = 'none';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '3px solid var(--coral)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <span>🏠</span>
          Desafios
        </button>

        {/* Notificações — ativado na Fase 9 (D-12): botão navegável + badge numérico */}
        <button
          type="button"
          onClick={() => void navigate({ to: '/notifications' })}
          style={{
            ...navRowBaseStyle,
            border: 'none',
            cursor: 'pointer',
            background: isActive('/notifications') ? 'var(--mint)' : 'none',
            color: isActive('/notifications') ? 'var(--green-ink)' : 'var(--muted)',
            textAlign: 'left',
            justifyContent: 'space-between',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            if (!isActive('/notifications')) e.currentTarget.style.background = 'var(--paper)';
          }}
          onMouseLeave={(e) => {
            if (!isActive('/notifications')) e.currentTarget.style.background = 'none';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '3px solid var(--coral)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🔔</span>
            Notificações
          </span>
          {!!unreadCount && unreadCount > 0 && (
            <span
              style={{
                background: 'var(--coral)',
                color: 'var(--card)',
                borderRadius: 999,
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 8px',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => void navigate({ to: '/profile' })}
          style={{
            ...navRowBaseStyle,
            border: 'none',
            cursor: 'pointer',
            background: isActive('/profile') ? 'var(--mint)' : 'none',
            color: isActive('/profile') ? 'var(--green-ink)' : 'var(--muted)',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            if (!isActive('/profile')) e.currentTarget.style.background = 'var(--paper)';
          }}
          onMouseLeave={(e) => {
            if (!isActive('/profile')) e.currentTarget.style.background = 'none';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '3px solid var(--coral)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <span>😎</span>
          Perfil
        </button>
      </nav>

      {/* Rodapé: avatar + Sair */}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
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
          type="button"
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
          onFocus={(e) => {
            e.currentTarget.style.outline = '3px solid var(--coral)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
