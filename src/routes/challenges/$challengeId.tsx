import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
import { StatusPill } from '../../components/StatusPill';
import { PrimaryButton } from '../../components/PrimaryButton';
import { WaitingRoomList } from '../../components/WaitingRoomList';
import { showToast } from '../../components/Toast';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { EvidenceUploadCard, type TodayEvidence } from '../../components/EvidenceUploadCard';

export const Route = createFileRoute('/challenges/$challengeId')({
  component: ChallengeDetailPage,
});

interface Participant {
  id: string;
  status: string;
  paidAt: string | null;
  user: { id: string; name: string; email: string };
}

interface ChallengeDetail {
  id: string;
  title: string;
  emoji: string;
  durationDays: number;
  collabAmount: string;
  platformFee: string;
  status: string;
  creatorId: string;
  participants: Participant[];
  createdAt: string;
}

interface WaitingRoomStatus {
  status: string;
  deadline: string;
  paidCount: number;
  totalCount: number;
  prize: string;
  participants: { name: string; paid: boolean }[];
}

function ChallengeDetailPage() {
  const { challengeId } = Route.useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [user, navigate]);

  const { data: challenge, isLoading, isError } = useQuery<ChallengeDetail>({
    queryKey: ['challenge', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}`);
      if (!res.ok) throw new Error('challenge-not-found');
      return (await res.json()) as ChallengeDetail;
    },
    enabled: !!user,
    retry: false,
  });

  // CHAL-05/D-13: nominal paid/pending list + live N-de-M + deadline + the
  // live prize (D-03, pitfall M4 — never the client-computed all-participants
  // estimate below, always the server value derived from the PAID count).
  const { data: waitingRoom } = useQuery<WaitingRoomStatus>({
    queryKey: ['waiting-room', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}/participants`);
      if (!res.ok) throw new Error('waiting-room-error');
      return (await res.json()) as WaitingRoomStatus;
    },
    enabled: !!challenge,
  });

  // EVID-01/03: the caller's own evidence for today, if any — feeds the
  // "posted-today" state of EvidenceUploadCard. Only relevant once the
  // challenge is ACTIVE (the Hoje tab is only shown then).
  const { data: todayEvidence } = useQuery<TodayEvidence | null>({
    queryKey: ['evidence-today', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}/evidences/today`);
      if (!res.ok) throw new Error('evidence-today-error');
      return (await res.json()) as TodayEvidence | null;
    },
    enabled: !!challenge && challenge.status === 'ACTIVE',
  });

  // D-09: creator-only cancellation, WAITING-only (guarded server-side too).
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/challenges/${challengeId}/cancel`, {});
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? 'Erro ao cancelar o desafio. Tente novamente.');
      }
      return res.json() as Promise<{ status: string }>;
    },
    onSuccess: () => {
      showToast('Desafio cancelado.');
      void queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
      void queryClient.invalidateQueries({ queryKey: ['waiting-room', challengeId] });
    },
    onError: (err: Error) => {
      showToast(err.message ?? 'Erro ao cancelar o desafio.');
    },
  });

  const handleCancel = () => {
    if (
      window.confirm(
        'Tem certeza que deseja cancelar este desafio? Quem já pagou entra na fila de reembolso e essa ação não pode ser desfeita.',
      )
    ) {
      cancelMutation.mutate();
    }
  };

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

  if (isError || !challenge) {
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
        <p style={{ color: 'var(--muted)', fontWeight: 600 }}>Desafio não encontrado.</p>
        <Link to="/home" style={{ color: 'var(--green)', fontWeight: 700, marginTop: 16, textDecoration: 'underline' }}>
          Voltar
        </Link>
      </section>
    );
  }

  const collab = parseFloat(challenge.collabAmount);
  const fee = parseFloat(challenge.platformFee);
  const participantCount = challenge.participants.length;
  // D-03/pitfall M4: prefer the server-computed live prize (derived from the
  // PAID count) once the waiting-room query has loaded; fall back to the
  // all-participants estimate only while it's still loading, so this tile
  // never disagrees with the waiting-room card's own prize figure.
  const prize = waitingRoom
    ? parseFloat(waitingRoom.prize)
    : Math.max(0, participantCount * collab - fee);
  // D-06: works for both the creator and any invitee who already accepted —
  // both have a Participant row and hit the same "pagar minha entrada" endpoint.
  const myParticipant = user
    ? challenge.participants.find((p) => p.user.id === user.id)
    : undefined;
  const isCreator = !!user && user.id === challenge.creatorId;
  const formattedDeadline = waitingRoom
    ? new Date(waitingRoom.deadline).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

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
      {/* Back button */}
      <Link
        to="/home"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.92rem',
          marginBottom: 12,
          padding: '4px 0',
          textDecoration: 'none',
        }}
      >
        ← Voltar
      </Link>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 8 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: 'var(--mint)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.8rem',
            flexShrink: 0,
          }}
        >
          {challenge.emoji}
        </div>
        <div>
          <h2
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.5rem',
              lineHeight: 1.1,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {challenge.title}
          </h2>
          <div style={{ marginTop: 4 }}>
            <StatusPill status={challenge.status} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 0 20px' }}>
        <div
          style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '11px 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'var(--ink)',
            }}
          >
            R$ {collab.toFixed(2).replace('.', ',')}
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginTop: 2,
            }}
          >
            Colaboração
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '11px 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'var(--green-ink)',
            }}
          >
            R$ {prize.toFixed(2).replace('.', ',')}
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginTop: 2,
            }}
          >
            Prêmio
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '11px 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'var(--ink)',
            }}
          >
            {participantCount}
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginTop: 2,
            }}
          >
            Pessoas
          </div>
        </div>
      </div>

      {/* Waiting room (CHAL-05, D-13): nominal paid/pending list, visible to
          ALL participants — the social-pressure engine — plus the live
          "N de M pagaram" counter, the 3-day deadline, and the creator's
          cancel action. Hidden once the challenge is no longer WAITING. */}
      {challenge.status === 'WAITING' && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              marginBottom: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ⏳ Aguardando turma
          </div>

          {waitingRoom ? (
            <>
              <div
                style={{
                  color: 'var(--green-ink)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  marginBottom: 4,
                }}
              >
                {waitingRoom.paidCount} de {waitingRoom.totalCount} pagaram
              </div>
              {formattedDeadline && (
                <div
                  style={{
                    color: 'var(--muted)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    marginBottom: 13,
                  }}
                >
                  Começa quando 3+ pagarem. Prazo: {formattedDeadline}
                </div>
              )}

              {waitingRoom.participants.length > 0 && (
                <WaitingRoomList participants={waitingRoom.participants} />
              )}
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--green-ink)',
                fontWeight: 600,
                padding: '6px 0',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 22,
                  height: 22,
                  border: '3px solid var(--mint-deep)',
                  borderTopColor: 'var(--green)',
                  borderRadius: '50%',
                  animation: 'sp 0.8s linear infinite',
                  flexShrink: 0,
                }}
              />
              <span>Carregando status do desafio...</span>
            </div>
          )}

          {myParticipant && !myParticipant.paidAt && (
            <div style={{ marginTop: 12 }}>
              <PrimaryButton
                onClick={() =>
                  void navigate({ to: '/participants/pay', search: { challengeId: challenge.id } })
                }
              >
                Pagar minha entrada
              </PrimaryButton>
            </div>
          )}

          {isCreator && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  padding: '12px 20px',
                  borderRadius: 16,
                  border: '1px solid var(--coral)',
                  background: 'transparent',
                  color: 'var(--coral)',
                  cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: cancelMutation.isPending ? 0.6 : 1,
                }}
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar desafio'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Core Loop (EVID-01/02): Hoje/Votar/Ranking tabs, sibling to the
          WAITING waiting-room block above — shown only once the challenge is
          ACTIVE. Votar/Ranking panels are placeholders here; Plans 05/06
          replace them. */}
      {challenge.status === 'ACTIVE' && (
        <div style={{ marginBottom: 16 }}>
          <SegmentedTabs>
            {(activeTab) => {
              if (activeTab === 'hoje') {
                return (
                  <EvidenceUploadCard
                    challengeId={challenge.id}
                    isPaid={myParticipant?.status === 'PAID'}
                    todayEvidence={todayEvidence}
                    onUploaded={() => {
                      void queryClient.invalidateQueries({ queryKey: ['evidence-today', challengeId] });
                    }}
                  />
                );
              }

              if (activeTab === 'votar') {
                return <PlaceholderPanel copy="Votação chega em breve." />;
              }

              return <PlaceholderPanel copy="Ranking chega em breve." />;
            }}
          </SegmentedTabs>
        </div>
      )}
    </section>
  );
}

/** Lightweight placeholder for the Votar/Ranking panels — filled by Plans 05/06. */
function PlaceholderPanel({ copy }: { copy: string }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 18,
        textAlign: 'center',
        color: 'var(--muted)',
        fontWeight: 600,
        fontSize: '0.9rem',
      }}
    >
      {copy}
    </div>
  );
}
