import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminClient } from '../../api/client';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormField } from '../../components/FormField';
import { AdminQueueTable } from '../../components/AdminQueueTable';
import { showToast } from '../../components/Toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export const Route = createFileRoute('/admin/')({
  component: AdminConsolePage,
});

// D-11: the secret is held in sessionStorage only, entered once, and never
// sent as a URL query param (RESEARCH.md A5 — a query param would land in
// server access logs). It is sent as an X-Admin-Secret header via
// createAdminClient, a distinct client from apiClient's cookie session.
const ADMIN_SECRET_KEY = 'adminSecret';

interface RefundRow {
  id: string;
  challengeTitle: string;
  participantName: string;
  amount: string;
  pixKey: string | null;
}

interface PayoutRow {
  id: string;
  challengeTitle: string;
  winnerName: string;
  amount: string;
  pixKey: string | null;
}

function AdminConsolePage() {
  const [secret, setSecret] = useState<string>(() => sessionStorage.getItem(ADMIN_SECRET_KEY) ?? '');
  const [secretInput, setSecretInput] = useState('');
  const queryClient = useQueryClient();

  // Hoisted above every early return (Rules of Hooks — Fases 6/7/8/9
  // pattern). isWeb decides table-vs-cards for AdminQueueTable; isDesktop
  // only picks the console header/page gutter (32 vs 24), reproducing the
  // padding WebShell used to provide before /admin went bare (D-02).
  const isWeb = useMediaQuery('(min-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const adminClient = useMemo(() => createAdminClient(secret), [secret]);

  const {
    data: refunds,
    isLoading: isRefundsLoading,
    isError: isRefundsError,
  } = useQuery<RefundRow[]>({
    queryKey: ['admin-refunds', secret],
    queryFn: async () => {
      const res = await adminClient.get('/admin/refunds');
      if (res.status === 401 || res.status === 403) {
        // D-11: a wrong/expired secret is rejected — clear it so the entry
        // form re-appears rather than looping on a bad stored value.
        sessionStorage.removeItem(ADMIN_SECRET_KEY);
        setSecret('');
        throw new Error('unauthorized');
      }
      if (!res.ok) throw new Error('admin-refunds-error');
      return (await res.json()) as RefundRow[];
    },
    enabled: !!secret,
    retry: false,
  });

  const markRefundedMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await adminClient.patch(`/admin/refunds/${paymentId}`, {});
      if (!res.ok) throw new Error('mark-refunded-error');
      return res.json() as Promise<{ id: string; status: string }>;
    },
    onSuccess: () => {
      showToast('Reembolso marcado como concluído.');
      void queryClient.invalidateQueries({ queryKey: ['admin-refunds', secret] });
    },
    onError: () => {
      showToast('Erro ao marcar reembolso. Tente novamente.');
    },
  });

  const {
    data: payouts,
    isLoading: isPayoutsLoading,
    isError: isPayoutsError,
  } = useQuery<PayoutRow[]>({
    queryKey: ['admin-payouts', secret],
    queryFn: async () => {
      const res = await adminClient.get('/admin/payouts');
      if (res.status === 401 || res.status === 403) {
        // D-11: a wrong/expired secret is rejected — clear it so the entry
        // form re-appears rather than looping on a bad stored value.
        sessionStorage.removeItem(ADMIN_SECRET_KEY);
        setSecret('');
        throw new Error('unauthorized');
      }
      if (!res.ok) throw new Error('admin-payouts-error');
      return (await res.json()) as PayoutRow[];
    },
    enabled: !!secret,
    retry: false,
  });

  const markPaidOutMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await adminClient.patch(`/admin/payouts/${paymentId}`, {});
      if (!res.ok) throw new Error('mark-paid-out-error');
      return res.json() as Promise<{ id: string; status: string }>;
    },
    onSuccess: () => {
      showToast('Repasse marcado como enviado.');
      void queryClient.invalidateQueries({ queryKey: ['admin-payouts', secret] });
    },
    onError: () => {
      showToast('Erro ao marcar repasse. Tente novamente.');
    },
  });

  const handleSubmitSecret = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = secretInput.trim();
    if (!trimmed) return;
    sessionStorage.setItem(ADMIN_SECRET_KEY, trimmed);
    setSecretInput('');
    setSecret(trimmed);
  };

  // D-03: "Sair" discards the key — the exact same pair of operations the
  // 401/403 branches above already run. queryKey includes `secret` and both
  // queries are enabled: !!secret, so no extra invalidation is needed.
  const handleSair = () => {
    sessionStorage.removeItem(ADMIN_SECRET_KEY);
    setSecret('');
  };

  // D-03/D-06: a queue that hasn't resolved yet (or that errored) simply
  // omits its segment — the header never shows undefined/NaN and never
  // waits on the slower queue.
  const counterSegments: string[] = [];
  if (!isRefundsLoading && refunds) {
    counterSegments.push(refunds.length === 1 ? '1 reembolso' : `${refunds.length} reembolsos`);
  }
  if (!isPayoutsLoading && payouts) {
    counterSegments.push(payouts.length === 1 ? '1 repasse' : `${payouts.length} repasses`);
  }
  const countersLabel = counterSegments.join(' · ');

  // State: no secret entered yet (or a prior attempt was rejected). D-04:
  // centered ~440px card, same vocabulary as the public auth pages (Fase 7).
  // No header here — "Sair" makes no sense before entering.
  if (!secret) {
    return (
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--paper)' }}>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 48 }}>
          <div style={{ width: 'min(440px, 100%)' }}>
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 24,
                padding: 28,
                boxShadow: 'var(--shadow)',
              }}
            >
              <h2
                style={{
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.35rem',
                  color: 'var(--ink)',
                  marginBottom: 8,
                }}
              >
                Painel admin
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: 20 }}>
                Informe a chave de administrador para ver as filas de reembolso e repasse.
              </p>
              <form onSubmit={handleSubmitSecret} noValidate>
                <FormField
                  id="admin-secret"
                  label="Chave de administrador"
                  type="password"
                  autoComplete="off"
                  registration={{ value: secretInput, onChange: (e) => setSecretInput(e.target.value) }}
                />
                <PrimaryButton type="submit">Entrar</PrimaryButton>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // D-06: no page-level loading/error early-return here. Each AdminQueueTable
  // instance below resolves its own loading/error/empty state — a failure
  // in one queue no longer hides the other (the bug this fixes lived at
  // L202-220 of the pre-extraction file).
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--paper)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isWeb ? '20px 32px' : '16px 22px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--paper)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h1
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.6rem',
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            Painel admin
          </h1>
          {countersLabel && (
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>{countersLabel}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSair}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--muted)',
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
      </header>

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isWeb ? (isDesktop ? '32px 32px 0' : '24px 24px 0') : '20px 22px 0',
        }}
      >
        <AdminQueueTable
          title="Fila de reembolso"
          subtitle="Desafios cancelados com pagamentos a devolver manualmente via Pix."
          rows={refunds}
          isLoading={isRefundsLoading}
          isError={isRefundsError}
          emptyLabel="Nenhum reembolso pendente. 🎉"
          errorLabel="Não foi possível carregar a fila de reembolso. Verifique a chave e tente novamente."
          personLabel={(row) => row.participantName}
          actionLabel="Marcar reembolsado"
          pendingActionLabel="Marcando..."
          onConfirmAction={(id) => markRefundedMutation.mutate(id)}
          isActionPending={markRefundedMutation.isPending}
          isWeb={isWeb}
        />
        <AdminQueueTable
          title="Fila de repasse de prêmios"
          subtitle="Prêmios finalizados aguardando o envio manual do Pix ao vencedor."
          rows={payouts}
          isLoading={isPayoutsLoading}
          isError={isPayoutsError}
          emptyLabel="Nenhum repasse pendente. 🎉"
          errorLabel="Não foi possível carregar a fila de repasse. Verifique a chave e tente novamente."
          personLabel={(row) => row.winnerName}
          actionLabel="Marcar enviado"
          pendingActionLabel="Marcando..."
          onConfirmAction={(id) => markPaidOutMutation.mutate(id)}
          isActionPending={markPaidOutMutation.isPending}
          isWeb={isWeb}
        />
      </main>
    </div>
  );
}
