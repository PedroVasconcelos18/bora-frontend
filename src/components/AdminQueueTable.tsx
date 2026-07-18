import { useEffect, useState } from 'react';
import { showToast } from './Toast';

/**
 * AdminQueueTable — parametric queue table for the admin console (D-06).
 *
 * Serves BOTH the refund queue and the payout queue, at BOTH widths: a
 * semantic <table> when isWeb is true (D-07), the existing card list when
 * isWeb is false (D-10, unchanged content). Each instance owns its own
 * loading/error/empty state (D-06) — one queue's failure never hides the
 * other's, fixing the page-level early-return bug that used to unmount both
 * queues on a single query's error.
 *
 * This component does NOT fetch data, does NOT read the breakpoint, and
 * does NOT know about the mutation/endpoint behind onConfirmAction — those
 * responsibilities belong to the route (routes/admin/index.tsx), which
 * passes rows/isLoading/isError/onConfirmAction/isActionPending/isWeb as
 * props. See 10-RESEARCH.md Package Legitimacy Audit — no table library,
 * no clipboard library: navigator.clipboard + a hand-rolled <table> cover
 * 100% of this component's needs.
 */

export interface AdminQueueRow {
  id: string;
  challengeTitle: string;
  amount: string;
  pixKey: string | null;
  /** Item C: motivo do reembolso (só a fila de refund traz; payouts não). */
  reason?: string | null;
}

export interface AdminQueueTableProps<T extends AdminQueueRow> {
  title: string;
  subtitle: string;
  rows: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  emptyLabel: string;
  errorLabel: string;
  personLabel: (row: T) => string;
  actionLabel: string;
  pendingActionLabel: string;
  onConfirmAction: (id: string) => void;
  isActionPending: boolean;
  isWeb: boolean;
}

const sectionHeadingStyle = {
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 800,
  fontSize: '1.4rem',
  color: 'var(--ink)',
  marginBottom: 4,
} as const;

const sectionSubtitleStyle = {
  color: 'var(--muted)',
  fontSize: '0.85rem',
  fontWeight: 400,
  marginBottom: 18,
} as const;

const spinnerStyle = {
  display: 'inline-block',
  width: 32,
  height: 32,
  border: '3px solid var(--mint-deep)',
  borderTopColor: 'var(--green)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  alignSelf: 'center',
} as const;

const emptyOrErrorCardStyle = {
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: '24px 18px',
  textAlign: 'center',
  color: 'var(--muted)',
  fontWeight: 600,
} as const;

const thStyle = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--muted)',
  borderBottom: '1px solid var(--line)',
} as const;

const tdStyle = {
  padding: '14px 16px',
  fontSize: '0.9rem',
  color: 'var(--ink)',
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
} as const;

const tdTitleStyle = {
  ...tdStyle,
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.92rem',
} as const;

const pixCellStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'ui-monospace, Menlo, monospace',
  fontSize: '0.85rem',
  color: 'var(--green-ink)',
} as const;

const actionBtnStyle = {
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.85rem',
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  background: 'var(--green-bright)',
  color: 'var(--green-ink)',
} as const;

const confirmBtnStyle = {
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.85rem',
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  background: 'var(--coral)',
  color: 'var(--card)',
} as const;

const cancelBtnStyle = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.85rem',
  padding: '8px 10px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  background: 'none',
  color: 'var(--muted)',
} as const;

const mobileCardStyle = {
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: '14px 16px',
  marginBottom: 12,
} as const;

const mobileActionBtnStyle = {
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
  cursor: 'pointer',
} as const;

function formatAmount(amount: string): string {
  return `R$ ${parseFloat(amount).toFixed(2).replace('.', ',')}`;
}

export function AdminQueueTable<T extends AdminQueueRow>({
  title,
  subtitle,
  rows,
  isLoading,
  isError,
  emptyLabel,
  errorLabel,
  personLabel,
  actionLabel,
  pendingActionLabel,
  onConfirmAction,
  isActionPending,
  isWeb,
}: AdminQueueTableProps<T>) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Reset the confirm state when a pending action SETTLES (success or
  // error) — success removes the row via invalidateQueries anyway; error
  // leaves the row in place but must fall back to the plain action button
  // instead of being stuck on "Confirmar?" forever.
  useEffect(() => {
    if (!isActionPending) {
      setConfirmingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActionPending]);

  async function handleCopyPixKey(pixKey: string) {
    try {
      await navigator.clipboard.writeText(pixKey);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = pixKey;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    showToast('Chave copiada');
  }

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={sectionHeadingStyle}>{title}</h2>
      <p style={sectionSubtitleStyle}>{subtitle}</p>

      {isLoading ? (
        <span style={spinnerStyle} />
      ) : isError ? (
        <div style={emptyOrErrorCardStyle}>{errorLabel}</div>
      ) : !rows || rows.length === 0 ? (
        <div style={emptyOrErrorCardStyle}>{emptyLabel}</div>
      ) : isWeb ? (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            overflow: 'hidden',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th scope="col" style={thStyle}>Desafio</th>
                <th scope="col" style={thStyle}>Pessoa</th>
                <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                <th scope="col" style={thStyle}>Chave Pix</th>
                <th scope="col" style={thStyle}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--line)' }}
                >
                  <td style={tdTitleStyle}>{row.challengeTitle}</td>
                  <td style={tdStyle}>
                    {personLabel(row)}
                    {row.reason && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                        {row.reason}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'right',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatAmount(row.amount)}
                  </td>
                  <td style={tdStyle}>
                    {row.pixKey ? (
                      <button
                        type="button"
                        onClick={() => void handleCopyPixKey(row.pixKey!)}
                        style={pixCellStyle}
                      >
                        {row.pixKey}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>não informada</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {confirmingId === row.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => onConfirmAction(row.id)}
                          style={confirmBtnStyle}
                          disabled={isActionPending}
                        >
                          {isActionPending ? pendingActionLabel : 'Confirmar?'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          style={cancelBtnStyle}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(row.id)}
                        style={actionBtnStyle}
                      >
                        {actionLabel}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        rows.map((row) => (
          <div key={row.id} style={mobileCardStyle}>
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
              <strong>{personLabel(row)}</strong>
            </div>
            {row.reason && (
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 2 }}>
                {row.reason}
              </div>
            )}
            <div style={{ fontSize: '0.9rem', color: 'var(--ink)', marginBottom: 2 }}>
              {formatAmount(row.amount)}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
              {row.pixKey ? (
                <>
                  Pix:{' '}
                  <button
                    type="button"
                    onClick={() => void handleCopyPixKey(row.pixKey!)}
                    style={pixCellStyle}
                  >
                    {row.pixKey}
                  </button>
                </>
              ) : (
                'Pix: não informada'
              )}
            </div>
            {confirmingId === row.id ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onConfirmAction(row.id)}
                  style={{ ...confirmBtnStyle, flex: 1, padding: '11px 18px', borderRadius: 14 }}
                  disabled={isActionPending}
                >
                  {isActionPending ? pendingActionLabel : 'Confirmar?'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  style={{ ...cancelBtnStyle, flex: 1, padding: '11px 18px', borderRadius: 14 }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingId(row.id)}
                style={mobileActionBtnStyle}
              >
                {actionLabel}
              </button>
            )}
          </div>
        ))
      )}
    </section>
  );
}
