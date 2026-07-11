import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
import { StatusPill } from '../../components/StatusPill';
import { PrimaryButton } from '../../components/PrimaryButton';
import { WaitingRoomList } from '../../components/WaitingRoomList';
import { showToast } from '../../components/Toast';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { EvidenceUploadCard, type TodayEvidence } from '../../components/EvidenceUploadCard';
import { VoteCard, type VoteCardEvidence, type VoteValue } from '../../components/VoteCard';
import { RankingList, type RankingData } from '../../components/RankingList';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../lib/breakpoints';

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
  // GET /challenges/:id already returns this field (ChallengesService.get
  // spreads the raw Prisma Challenge row); only the frontend type omitted
  // it. Set server-side at WAITING->ACTIVE activation (payments.service.ts
  // `starts_at = NOW()`), so it is always present once status is ACTIVE.
  // Needed for the web header's "Dia X de Y · início → fim" meta line
  // (D-04/CHALW-01) — no new query, no new endpoint (Rule 1/2 fix).
  startsAt: string | null;
}

interface MyPayout {
  status: 'PAYOUT_PENDING' | 'PAID_OUT';
  amount: string;
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

  // VOTE-01/04: today's votable evidences from other participants (tally
  // deliberately omitted server-side, D-05). Own evidence already excluded
  // by the API — do not re-filter it client-side.
  const { data: votableEvidences, isLoading: isVotableLoading } = useQuery<VoteCardEvidence[]>({
    queryKey: ['votable-evidences', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}/evidences`);
      if (!res.ok) throw new Error('votable-evidences-error');
      return (await res.json()) as VoteCardEvidence[];
    },
    enabled: !!challenge && challenge.status === 'ACTIVE',
  });

  // RANK-01/02/03/04, D-09: ranking + streak grid, refetching on screen open
  // AND window/tab focus (not live polling) — explicit here for clarity even
  // though it matches TanStack Query v5's own default.
  const { data: ranking, isLoading: isRankingLoading } = useQuery<RankingData>({
    queryKey: ['ranking', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}/ranking`);
      if (!res.ok) throw new Error('ranking-error');
      return (await res.json()) as RankingData;
    },
    // D-11: relaxed to also fire once FINISHED so the frozen final standings
    // still load for the finalizado screen — RankingService already works
    // for any challenge status, this is purely a frontend guard relaxation.
    enabled: !!challenge && (challenge.status === 'ACTIVE' || challenge.status === 'FINISHED'),
    refetchOnWindowFocus: true,
  });

  // PAY-06/D-11: the caller's own prize status for a finalizado challenge —
  // null for a non-winner. refetchOnWindowFocus so the banner flips
  // pendente -> enviado after the admin marks PAID_OUT, without a hard
  // reload (mirrors the Phase 3 D-09 refetch-on-focus pattern).
  const { data: myPayout } = useQuery<MyPayout | null>({
    queryKey: ['my-payout', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}/my-payout`);
      if (!res.ok) throw new Error('my-payout-error');
      return (await res.json()) as MyPayout | null;
    },
    enabled: !!challenge && challenge.status === 'FINISHED',
    refetchOnWindowFocus: true,
  });

  // Tracks which evidence's card is mid-vote so only the tapped card shows
  // its buttons' loading state (not the whole list).
  const [votingEvidenceId, setVotingEvidenceId] = useState<string | null>(null);

  // CHALW-01/D-01/D-02/D-03: in-place panel state for the web desktop reflow
  // (default 3-column | votar | feed | ranking expanded panels). Not a new
  // route, not a modal. Only the 'default' layout is implemented by this
  // plan (Plan 06-03 wires the votar/feed/ranking branches) — any other
  // panel value currently falls through to the default layout below.
  const [panel, setPanel] = useState<'default' | 'votar' | 'feed' | 'ranking'>('default');

  // D-12/D-13: this route body renders inside BOTH the mobile device tree
  // and the web WebShell tree (__root.tsx's single <Outlet/> mounts it in
  // either case) — this internal gate is the only way to keep the
  // pre-existing mobile JSX byte-identical while adding the web layout
  // beside it. Computed unconditionally, before any early return, so the
  // rules of hooks stay satisfied regardless of which branch is taken next
  // (mirrors the identical pattern already established in home.tsx by Plan
  // 06-01 — the plan text for this task placed this hook after the
  // isLoading/isError early returns, which would violate the rules of hooks
  // by conditionally skipping this hook call on some renders; corrected
  // here per deviation Rule 1).
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  const castVoteMutation = useMutation({
    mutationFn: async ({ evidenceId, value }: { evidenceId: string; value: VoteValue }) => {
      const res = await apiClient.post(`/evidences/${evidenceId}/votes`, { value });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? 'Erro ao registrar voto. Tente novamente.');
      }
      return res.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      showToast('Voto registrado!');
      void queryClient.invalidateQueries({ queryKey: ['votable-evidences', challengeId] });
      // D-09: a cast vote can resolve/change another participant's tally the
      // next cron tick, but the acting user's own vote-count-of-day feel
      // should invalidate immediately rather than waiting for a focus event.
      void queryClient.invalidateQueries({ queryKey: ['ranking', challengeId] });
    },
    onError: (err: Error) => {
      showToast(err.message ?? 'Erro ao registrar voto.');
    },
    onSettled: () => {
      setVotingEvidenceId(null);
    },
  });

  const handleVote = (evidenceId: string, value: VoteValue) => {
    setVotingEvidenceId(evidenceId);
    castVoteMutation.mutate({ evidenceId, value });
  };

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

  // D-12: the pre-existing mobile <section> return, moved unchanged inside
  // this gate — its markup/text/WAITING/ACTIVE(SegmentedTabs)/FINISHED
  // blocks are untouched, so <768px stays byte-identical.
  if (!isWeb) {
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

      {/* Core Loop (EVID-01/02, VOTE-01/04, RANK-01/02/03/04): Hoje/Votar/
          Ranking tabs, sibling to the WAITING waiting-room block above —
          shown only once the challenge is ACTIVE. All three tabs are real. */}
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
                      // D-09: the acting user's own posted-today state feeds
                      // into their streak grid — invalidate immediately
                      // rather than waiting for a window-focus refetch.
                      void queryClient.invalidateQueries({ queryKey: ['ranking', challengeId] });
                    }}
                  />
                );
              }

              if (activeTab === 'votar') {
                return (
                  <VotarPanel
                    isLoading={isVotableLoading}
                    evidences={votableEvidences}
                    votingEvidenceId={votingEvidenceId}
                    onVote={handleVote}
                  />
                );
              }

              return <RankingPanel isLoading={isRankingLoading} ranking={ranking} />;
            }}
          </SegmentedTabs>
        </div>
      )}

      {/* Finalizado (PAY-06/D-11): the frozen final ranking as a natural
          continuation of the live Ranking tab — no bespoke celebration
          screen. A winner sees a prize-status banner above it; a non-winner
          sees the same frozen standings with no banner (RankingList already
          surfaces who won via leaders). */}
      {challenge.status === 'FINISHED' && (
        <div style={{ marginBottom: 16 }}>
          {myPayout && <WinnerBanner payout={myPayout} />}
          <RankingPanel isLoading={isRankingLoading} ranking={ranking} />
        </div>
      )}
    </section>
  );
  }

  // ------------------------------------------------------------------------
  // Web (>=768px) branch below — reached only once isWeb is true. CHALW-01,
  // D-01/D-02/D-03/D-04/D-11.
  // ------------------------------------------------------------------------

  // D-11: WAITING/FINISHED get only a simple centered single-column
  // fallback — the SAME existing WAITING/FINISHED JSX reused verbatim
  // (no new component, no new copy), just wrapped narrower. The rich
  // WAITING/FINISHED web layout is Phase 7.
  if (challenge.status !== 'ACTIVE') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
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

        {challenge.status === 'FINISHED' && (
          <div style={{ marginBottom: 16 }}>
            {myPayout && <WinnerBanner payout={myPayout} />}
            <RankingPanel isLoading={isRankingLoading} ranking={ranking} />
          </div>
        )}
      </div>
    );
  }

  // ACTIVE, web: shared header (D-01) + panel region. Only 'default' is
  // implemented by this plan (Task 2 fills it in) — any other panel value
  // currently falls through to the same default layout until Plan 06-03
  // adds the votar/feed/ranking branches.
  const startsAtDate = challenge.startsAt ? new Date(challenge.startsAt) : null;
  const endsAtDate = startsAtDate
    ? new Date(startsAtDate.getTime() + (challenge.durationDays - 1) * 24 * 60 * 60 * 1000)
    : null;
  // Client-side "Dia X de Y" display estimate (not authoritative — the
  // backend's per-day streak derivation already uses São Paulo calendar
  // days; this is a header meta line only, no new query).
  const dayOfChallenge = startsAtDate
    ? Math.min(
        challenge.durationDays,
        Math.max(1, Math.floor((Date.now() - startsAtDate.getTime()) / (24 * 60 * 60 * 1000)) + 1),
      )
    : 1;
  const shortDateFormat: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
  const formattedStart = startsAtDate ? startsAtDate.toLocaleDateString('pt-BR', shortDateFormat) : '—';
  const formattedEnd = endsAtDate ? endsAtDate.toLocaleDateString('pt-BR', shortDateFormat) : '—';
  const formattedPrize = prize.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div>
      {/* Shared web header (D-01) — back-link, emoji tile, title, StatusPill,
          meta line, prize-tile. Common to all 4 panels. */}
      <div style={{ marginBottom: 18 }}>
        {panel === 'default' ? (
          <Link
            to="/home"
            style={{
              color: 'var(--muted)',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
            }}
          >
            ← Seus desafios
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setPanel('default')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--muted)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
            }}
          >
            ← Voltar pro desafio
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
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

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1
                style={{
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: '1.6rem',
                  lineHeight: 1.1,
                  color: 'var(--green-ink)',
                  margin: 0,
                }}
              >
                {challenge.title}
              </h1>
              <StatusPill status={challenge.status} />
            </div>
            <div style={{ marginTop: 4, fontSize: '0.88rem', fontWeight: 600, color: 'var(--muted)' }}>
              Dia {dayOfChallenge} de {challenge.durationDays} · {formattedStart} → {formattedEnd} · {participantCount} pessoas
            </div>
          </div>

          <div
            style={{
              marginLeft: 'auto',
              background: 'var(--mint)',
              borderRadius: 16,
              padding: '12px 20px',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--green-ink)',
              }}
            >
              {panel === 'ranking' ? 'Prêmio em jogo' : 'Prêmio acumulado'}
            </div>
            <div
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: '1.4rem',
                color: 'var(--green-ink)',
              }}
            >
              {formattedPrize}
            </div>
          </div>
        </div>
      </div>

      {/* Panel region — only 'default' is implemented by this plan (Task 2
          fills in the 3-column layout below). */}
      <div>{/* Task 2 replaces this placeholder with the default 3-column layout */}</div>
    </div>
  );
}

/**
 * WinnerBanner — the prize-status banner for a finalizado challenge (D-11).
 * Mirrors RankingList's mint prize-note card style. Amount is always the
 * server-created payout row's amount (payment.amount), never computed
 * client-side (T-04-15).
 */
function WinnerBanner({ payout }: { payout: MyPayout }) {
  const formattedAmount = parseFloat(payout.amount).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      style={{
        background: 'var(--mint)',
        borderRadius: 14,
        padding: 15,
        marginBottom: 14,
        color: 'var(--green-ink)',
        fontWeight: 700,
        fontSize: '0.95rem',
      }}
    >
      {payout.status === 'PAYOUT_PENDING'
        ? `🏆 Você venceu! Prêmio ${formattedAmount} — pendente ⏳`
        : '🏆 Prêmio enviado ✅'}
    </div>
  );
}

/**
 * VotarPanel — the "Votar" tab (VOTE-01/04, D-04/D-05). Renders the vertical
 * vote-card list, the shared loading spinner, or the empty-state copy.
 * The route owns the query + mutation; this is purely the render switch.
 */
function VotarPanel({
  isLoading,
  evidences,
  votingEvidenceId,
  onVote,
}: {
  isLoading: boolean;
  evidences: VoteCardEvidence[] | undefined;
  votingEvidenceId: string | null;
  onVote: (evidenceId: string, value: VoteValue) => void;
}) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <span
          style={{
            display: 'inline-block',
            width: 22,
            height: 22,
            border: '3px solid var(--mint-deep)',
            borderTopColor: 'var(--green)',
            borderRadius: '50%',
            animation: 'sp 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (!evidences || evidences.length === 0) {
    return (
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          padding: 18,
          textAlign: 'center',
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
          Nenhuma evidência pra votar agora
        </div>
        <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
          Quando alguém postar a evidência do dia, ela aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div>
      {evidences.map((evidence) => (
        <VoteCard
          key={evidence.id}
          evidence={evidence}
          isVoting={votingEvidenceId === evidence.id}
          onVote={(value) => onVote(evidence.id, value)}
        />
      ))}
    </div>
  );
}

/**
 * RankingPanel — the "Ranking" tab (RANK-01/02/03/04, D-09). Renders the
 * shared loading spinner or the RankingList (rows + progress + prize note +
 * leader/tie note + per-participant StreakGrid). The route owns the
 * refetchOnWindowFocus query; this is purely the render switch.
 */
function RankingPanel({
  isLoading,
  ranking,
}: {
  isLoading: boolean;
  ranking: RankingData | undefined;
}) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <span
          style={{
            display: 'inline-block',
            width: 22,
            height: 22,
            border: '3px solid var(--mint-deep)',
            borderTopColor: 'var(--green)',
            borderRadius: '50%',
            animation: 'sp 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (!ranking) {
    return null;
  }

  return <RankingList ranking={ranking} />;
}
