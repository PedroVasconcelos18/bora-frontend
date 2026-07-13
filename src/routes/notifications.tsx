import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../lib/breakpoints';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { groupByDay, buildDeepLink, type NotificationRow } from '../lib/notifications';
import { NotificationCard } from '../components/NotificationCard';

// Rota autenticada (NOTIF-04) — não entra em PUBLIC_ROUTES, nenhuma edição
// em authGuard.ts necessária; resolveGuardRedirect já bounces pro /login
// sem sessão.
export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Hook hoisted ABOVE any early return — regra dos hooks (Fase 6 P02 já
  // quebrou isso uma vez, ver STATE.md).
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
  } = useQuery<NotificationRow[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      if (!res.ok) throw new Error('notifications-error');
      return (await res.json()) as NotificationRow[];
    },
    enabled: !!user,
  });

  const { data: unreadCount } = useUnreadCount();

  // Marcar UM item como lido (D-11): dispara ao clicar no card, NUNCA ao
  // simplesmente abrir o painel. Invalida as duas queries na hora — o badge
  // cai imediatamente, sem esperar os 60s do polling.
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/notifications/${id}/read`, {});
      if (!res.ok) throw new Error('mark-read-error');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/notifications/read-all', {});
      if (!res.ok) throw new Error('mark-all-read-error');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (!user) return null;

  const hasUnread = !!unreadCount && unreadCount > 0;

  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        margin: '6px 0 20px',
      }}
    >
      <h1
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: isWeb ? '1.9rem' : '1.55rem',
          color: isWeb ? 'var(--green-ink)' : 'var(--ink)',
          margin: 0,
        }}
      >
        Notificações
      </h1>
      <button
        type="button"
        disabled={!hasUnread}
        onClick={() => markAllReadMutation.mutate()}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: hasUnread ? 'pointer' : 'default',
          opacity: hasUnread ? 1 : 0.5,
          color: 'var(--green)',
          fontWeight: 700,
          fontSize: '0.85rem',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}
      >
        Marcar todas como lidas
      </button>
    </div>
  );

  const loadingBlock = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0' }}>
      <span
        style={{
          display: 'inline-block',
          width: 28,
          height: 28,
          border: '3px solid var(--mint-deep)',
          borderTopColor: 'var(--green)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem' }}>
        Carregando notificações…
      </span>
    </div>
  );

  const errorBlock = (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 20,
        background: 'var(--card)',
        textAlign: 'center',
        padding: '32px 24px',
      }}
    >
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 10 }}>
        Não deu pra carregar suas notificações agora.
      </p>
      <button
        type="button"
        onClick={() => void refetch()}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--green)',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}
      >
        Tenta de novo
      </button>
    </div>
  );

  const emptyBlock = (
    <div
      style={{
        border: '2px dashed var(--mint-deep)',
        borderRadius: 24,
        background: 'var(--card)',
        textAlign: 'center',
        padding: isWeb ? '72px 40px' : '48px 24px',
      }}
    >
      <div style={{ fontSize: '3rem' }}>🌱</div>
      <h2
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.4rem',
          color: 'var(--green-ink)',
          margin: '10px 0 6px',
        }}
      >
        Nenhuma notificação ainda
      </h2>
      <p style={{ margin: 0, color: 'var(--muted)', fontWeight: 600, fontSize: '0.95rem' }}>
        Quando alguém pagar, postar evidência ou a turma decidir um resultado, aparece aqui.
      </p>
    </div>
  );

  const listBlock = (
    <>
      {groupByDay(notifications ?? []).map((group) => (
        <div key={group.label}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            {group.label}
          </div>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: '6px 20px',
              marginBottom: 22,
            }}
          >
            {group.items.map((n, i) => (
              <NotificationCard
                key={n.id}
                notification={n}
                dayLabel={group.label}
                isLast={i === group.items.length - 1}
                onOpen={() => {
                  markReadMutation.mutate(n.id);
                  void navigate(buildDeepLink(n));
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );

  const content = (
    <>
      {header}
      {isLoading && loadingBlock}
      {!isLoading && isError && errorBlock}
      {!isLoading && !isError && (notifications?.length ?? 0) === 0 && emptyBlock}
      {!isLoading && !isError && (notifications?.length ?? 0) > 0 && listBlock}
    </>
  );

  if (isWeb) {
    return <div style={{ maxWidth: 760 }}>{content}</div>;
  }

  return <main style={{ padding: '20px 18px 96px', flex: 1 }}>{content}</main>;
}
