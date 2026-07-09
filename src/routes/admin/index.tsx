import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminClient } from '../../api/client';
import { PrimaryButton } from '../../components/PrimaryButton';
import { showToast } from '../../components/Toast';

export const Route = createFileRoute('/admin/')({
  component: AdminRefundQueuePage,
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

function AdminRefundQueuePage() {
  const [secret, setSecret] = useState<string>(() => sessionStorage.getItem(ADMIN_SECRET_KEY) ?? '');
  const [secretInput, setSecretInput] = useState('');
  const queryClient = useQueryClient();

  const adminClient = useMemo(() => createAdminClient(secret), [secret]);

  const {
    data: refunds,
    isLoading,
    isError,
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

  const handleSubmitSecret = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = secretInput.trim();
    if (!trimmed) return;
    sessionStorage.setItem(ADMIN_SECRET_KEY, trimmed);
    setSecretInput('');
    setSecret(trimmed);
  };

  // State: no secret entered yet (or a prior attempt was rejected).
  if (!secret) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 26px',
        }}
      >
        <h2
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '1.3rem',
            color: 'var(--ink)',
            marginBottom: 8,
          }}
        >
          Painel admin
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: 20 }}>
          Informe a chave de administrador para ver a fila de reembolso.
        </p>
        <form onSubmit={handleSubmitSecret} noValidate>
          <input
            type="password"
            autoComplete="off"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="Chave de administrador"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              border: '2px solid var(--line)',
              background: 'var(--card)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              color: 'var(--ink)',
              outline: 'none',
              marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />
          <PrimaryButton type="submit">Entrar</PrimaryButton>
        </form>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px 26px',
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
      </section>
    );
  }

  if (isError) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px 26px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>😕</div>
        <p style={{ color: 'var(--muted)', fontWeight: 600 }}>
          Não foi possível carregar a fila de reembolso. Verifique a chave e tente novamente.
        </p>
      </section>
    );
  }

  const rows = refunds ?? [];

  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 22px 32px',
        overflowY: 'auto',
      }}
    >
      <h2
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: '1.4rem',
          color: 'var(--ink)',
          marginBottom: 4,
        }}
      >
        Fila de reembolso
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 18 }}>
        Desafios cancelados com pagamentos a devolver manualmente via Pix.
      </p>

      {rows.length === 0 ? (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: '24px 18px',
            textAlign: 'center',
            color: 'var(--muted)',
            fontWeight: 600,
          }}
        >
          Nenhum reembolso pendente. 🎉
        </div>
      ) : (
        rows.map((row) => (
          <div
            key={row.id}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              padding: '14px 16px',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--ink)',
                marginBottom: 6,
              }}
            >
              {row.challengeTitle}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--ink)', marginBottom: 2 }}>
              <strong>{row.participantName}</strong>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--ink)', marginBottom: 2 }}>
              R$ {parseFloat(row.amount).toFixed(2).replace('.', ',')}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
              Pix: {row.pixKey ?? 'não informada'}
            </div>
            <button
              type="button"
              onClick={() => markRefundedMutation.mutate(row.id)}
              disabled={markRefundedMutation.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '11px 18px',
                borderRadius: 14,
                border: 'none',
                background: 'var(--green-bright)',
                color: 'var(--green-ink)',
                cursor: markRefundedMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: markRefundedMutation.isPending ? 0.6 : 1,
              }}
            >
              {markRefundedMutation.isPending ? 'Marcando...' : 'Marcar reembolsado'}
            </button>
          </div>
        ))
      )}
    </section>
  );
}
