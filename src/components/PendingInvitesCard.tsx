import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { showToast } from './Toast';
import { useMediaQuery } from '../hooks/useMediaQuery';

export interface PendingInvite {
  id: string;
  email: string;
}

interface PendingInvitesCardProps {
  challengeId: string;
  invites: PendingInvite[];
  /** Only the challenge creator can edit/delete invites (guarded server-side too). */
  canManage: boolean;
}

/**
 * PendingInvitesCard — the "convidados que ainda não aceitaram" list in the
 * waiting room (feedback QA 5a). Before this, invited-but-not-accepted people
 * were invisible in the challenge detail (they only have an Invite row, no
 * Participant), so the list "aparecia e sumia". The creator can edit the
 * email (re-dispatches the invite) or remove the invite entirely.
 */
export function PendingInvitesCard({ challengeId, invites, canManage }: PendingInvitesCardProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState('');
  // Item E: no mobile (<768) as ações Reenviar/Editar/Excluir quebram pra uma
  // segunda linha em vez de espremer/estourar a linha do "Aguardando aceite".
  const isMobile = !useMediaQuery('(min-width: 768px)');

  const invalidate = () => {
    // The count/prize and this list all live in the waiting-room query.
    void queryClient.invalidateQueries({ queryKey: ['waiting-room', challengeId] });
    void queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
  };

  const editMutation = useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) => {
      const res = await apiClient.patch(`/invites/${id}`, { targetEmail: email });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(err.message) ? err.message[0] : err.message;
        throw new Error(msg ?? 'Erro ao editar o convite.');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Convite atualizado e reenviado ✉️');
      setEditingId(null);
      setDraftEmail('');
      invalidate();
    },
    onError: (e: Error) => showToast(e.message ?? 'Erro ao editar o convite.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/invites/${id}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'Erro ao remover o convite.');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Convite removido.');
      invalidate();
    },
    onError: (e: Error) => showToast(e.message ?? 'Erro ao remover o convite.'),
  });

  // Reenviar o convite pro MESMO e-mail (feedback: reeditar/salvar com o e-mail
  // igual não reenviava de forma óbvia). Botão explícito, sem mexer no e-mail.
  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/invites/${id}/resend`, {});
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'Erro ao reenviar o convite.');
      }
      return res.json();
    },
    onSuccess: () => showToast('Convite reenviado ✉️'),
    onError: (e: Error) => showToast(e.message ?? 'Erro ao reenviar o convite.'),
  });

  if (invites.length === 0) return null;

  const startEdit = (invite: PendingInvite) => {
    setEditingId(invite.id);
    setDraftEmail(invite.email);
  };

  const busy = editMutation.isPending || deleteMutation.isPending || resendMutation.isPending;

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          color: 'var(--muted)',
          marginBottom: 8,
        }}
      >
        Convidados ({invites.length})
      </div>

      {invites.map((invite, idx) => {
        const isEditing = editingId === invite.id;
        return (
          <div
            key={invite.id}
            style={{
              padding: '8px 0',
              borderBottom: idx < invites.length - 1 ? '1px solid var(--line)' : 'none',
            }}
          >
            {isEditing ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="email"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  aria-label="Novo e-mail do convidado"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    padding: '9px 11px',
                    fontSize: '0.85rem',
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={busy || !draftEmail.trim()}
                  onClick={() => editMutation.mutate({ id: invite.id, email: draftEmail.trim() })}
                  style={{
                    background: 'var(--green-bright)',
                    color: 'var(--green-ink)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '9px 12px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy || !draftEmail.trim() ? 0.6 : 1,
                    fontFamily: '"Baloo 2", system-ui, sans-serif',
                    flexShrink: 0,
                  }}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditingId(null);
                    setDraftEmail('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--muted)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  ...(isMobile ? { flexWrap: 'wrap' as const } : {}),
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--mint)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.9rem',
                    flexShrink: 0,
                  }}
                >
                  ✉️
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {invite.email}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: '#EEE9DD',
                    color: 'var(--muted)',
                    flexShrink: 0,
                  }}
                >
                  Aguardando aceite
                </span>
                {canManage && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexShrink: 0,
                      ...(isMobile
                        ? { flexBasis: '100%', justifyContent: 'flex-end', marginTop: 6 }
                        : {}),
                    }}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => resendMutation.mutate(invite.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--green)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: busy ? 'not-allowed' : 'pointer',
                        fontFamily: '"Baloo 2", system-ui, sans-serif',
                      }}
                    >
                      Reenviar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startEdit(invite)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--green)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: busy ? 'not-allowed' : 'pointer',
                        fontFamily: '"Baloo 2", system-ui, sans-serif',
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(`Remover o convite de ${invite.email}? Essa ação não pode ser desfeita.`)
                        ) {
                          deleteMutation.mutate(invite.id);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--coral)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: busy ? 'not-allowed' : 'pointer',
                        fontFamily: '"Baloo 2", system-ui, sans-serif',
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
