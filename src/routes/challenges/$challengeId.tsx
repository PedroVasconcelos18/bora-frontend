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
import { StreakGrid, type StreakCellState } from '../../components/StreakGrid';
import { EvidenceStatusBadge, type EvidenceStatus } from '../../components/EvidenceStatusBadge';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../lib/breakpoints';

const R2_PUBLIC_BASE_URL: string = import.meta.env.VITE_R2_PUBLIC_BASE_URL ?? '';

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

// --- Web default-panel helpers (CHALW-01, Task 2) --------------------------
// Pure, presentational — mirror the module-level helper idiom already used
// by VoteCard.tsx (VOTE_WINDOW_MS/formatPostedMeta) and ChallengeCard.tsx
// (formatBRL). No new query/endpoint: these only reshape data already
// fetched by the route.

interface FeedPreviewItem {
  key: string;
  name: string;
  timeLabel: string;
  objectKey: string;
  badgeStatus: EvidenceStatus;
}

const VOTE_WINDOW_MS = 24 * 60 * 60 * 1000;

function initialsOf(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// v1.0's Evidence model has no caption/legenda field (objectKey,
// evidenceDate, status, windowClosesAt, postedAt, resolvedAt only) — the
// feed preview card intentionally omits a caption line rather than
// fabricating copy the backend never returns (reuse-only constraint).
function toBadgeStatus(status: 'PENDING' | 'ACCEPTED' | 'REJECTED'): EvidenceStatus {
  return status === 'PENDING' ? 'SENT' : status;
}

// CHALW-01/03 (Plan 06-02 + 06-03): builds the combined "today" feed —
// own evidence (if posted) + others' votable evidences, in NO particular
// status filter (D-06). Shared by the default panel's 3-item preview
// column and DesktopFeedPanel's full gallery grid, so the combine logic
// (and its "no status filter" guarantee) lives in exactly one place.
function buildFeedItems(
  todayEvidence: (TodayEvidence & { postedAt?: string }) | null | undefined,
  votableEvidences: VoteCardEvidence[] | undefined,
  userName: string | undefined,
): FeedPreviewItem[] {
  const items: FeedPreviewItem[] = [];
  if (todayEvidence) {
    items.push({
      key: 'own',
      name: userName ?? 'Você',
      timeLabel: todayEvidence.postedAt ? formatClockTime(new Date(todayEvidence.postedAt)) : 'Hoje',
      objectKey: todayEvidence.objectKey,
      badgeStatus: toBadgeStatus(todayEvidence.status),
    });
  }
  for (const evidence of votableEvidences ?? []) {
    items.push({
      key: evidence.id,
      name: evidence.authorName,
      timeLabel: formatClockTime(new Date(new Date(evidence.windowClosesAt).getTime() - VOTE_WINDOW_MS)),
      objectKey: evidence.objectKey,
      badgeStatus: toBadgeStatus(evidence.status),
    });
  }
  return items;
}

const infoCardStyle = {
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 20,
  padding: 20,
} as const;

const cardHeadingStyle = {
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '1.05rem',
  color: 'var(--ink)',
  marginBottom: 12,
} as const;

const ruleLineStyle = {
  fontSize: '0.88rem',
  fontWeight: 600,
  color: 'var(--ink)',
} as const;

const linkButtonStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--green)',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
} as const;

const avatarSmallStyle = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: 'var(--green)',
  display: 'grid',
  placeItems: 'center',
  // WEB-05: --card (pure white surface token) reused as the white text
  // color here — no dedicated "white" token exists in tokens.css, and this
  // avoids introducing a new bare hex value.
  color: 'var(--card)',
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.7rem',
  flexShrink: 0,
} as const;

/**
 * DetailRow — one key/value line in the "Detalhes" info card (Início, Fim,
 * Colaboração via Pix, Taxa da plataforma). Presentational only.
 */
function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        padding: '8px 0',
        borderBottom: last ? 'none' : '1px solid var(--line)',
        fontSize: '0.88rem',
      }}
    >
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{value}</span>
    </div>
  );
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
  //
  // The `& { postedAt?: string }` widening is a type-only addition (no new
  // query/endpoint): GET /challenges/:id/evidences/today already returns
  // the raw Prisma Evidence row (evidences.service.ts's getTodayEvidence),
  // which includes `postedAt` — EvidenceUploadCard's TodayEvidence type
  // just doesn't declare it. Reading it here (web feed preview's "hora",
  // Task 2/CHALW-01) is safe: extra properties on the object are ignored by
  // EvidenceUploadCard's narrower prop type.
  const { data: todayEvidence } = useQuery<(TodayEvidence & { postedAt?: string }) | null>({
    queryKey: ['evidence-today', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}/evidences/today`);
      if (!res.ok) throw new Error('evidence-today-error');
      return (await res.json()) as (TodayEvidence & { postedAt?: string }) | null;
    },
    enabled: !!challenge && challenge.status === 'ACTIVE',
  });

  // VOTE-01/04: today's votable evidences from other participants (tally
  // deliberately omitted server-side, D-05). Own evidence already excluded
  // by the API — do not re-filter it client-side.
  //
  // isError/refetch (CHALW-02, Plan 06-03) are exposed here so
  // DesktopVotarPanel can render the erro card + "Tentar de novo" without a
  // new query — this is the SAME query the mobile VotarPanel already reads.
  const {
    data: votableEvidences,
    isLoading: isVotableLoading,
    isError: isVotableError,
    refetch: refetchVotable,
  } = useQuery<VoteCardEvidence[]>({
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

  // Default panel data (CHALW-01/D-04, Task 2) — reshapes the route's
  // already-fetched queries only, no new query/endpoint.
  const turmaParticipants = challenge.participants.map((p) => ({
    name: p.user.name,
    paid: p.status === 'PAID' || !!p.paidAt,
  }));
  const myStreak = ranking?.participants.find((p) => p.id === myParticipant?.id)?.streak ?? [];

  // Feed preview (D-06): own evidence (if posted) + others' votable
  // evidences (already excludes own, per the votable-evidences API
  // contract), full array unfiltered by status — max 3 items shown here,
  // "Ver feed completo" (setPanel('feed')) opens the full DesktopFeedPanel
  // gallery over this SAME unsliced array (CHALW-03, Plan 06-03).
  const feedItems = buildFeedItems(todayEvidence, votableEvidences, user?.name);
  const feedPreviewItems = feedItems.slice(0, 3);

  // Votação aberta teaser (omitted entirely when N === 0, per D-04).
  const votableCount = votableEvidences?.length ?? 0;
  const earliestWindowCloses =
    votableEvidences && votableEvidences.length > 0
      ? votableEvidences.reduce(
          (earliest, e) => (new Date(e.windowClosesAt) < new Date(earliest) ? e.windowClosesAt : earliest),
          votableEvidences[0].windowClosesAt,
        )
      : null;
  const formattedVoteDeadline = earliestWindowCloses ? formatClockTime(new Date(earliestWindowCloses)) : null;

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

      {/* Panel region — 'default' (CHALW-01/D-04) plus the three in-place
          expansions added by Plan 06-03: 'votar' (CHALW-02), 'feed'
          (CHALW-03), 'ranking' (CHALW-04). Exactly one branch renders at a
          time, driven by the panel state Plan 06-02 scaffolded. */}
      {panel === 'default' && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        {/* Column 1 — info: Regras do jogo / Detalhes / A turma / Sua sequência */}
        <div
          style={{
            flex: '1 1 290px',
            minWidth: 260,
            maxWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={infoCardStyle}>
            <div style={cardHeadingStyle}>Regras do jogo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={ruleLineStyle}>📸 1 foto por dia, dentro do dia</div>
              <div style={ruleLineStyle}>🗳️ A turma valida em até 24h</div>
              <div style={ruleLineStyle}>🏆 Quem mais cumprir leva o prêmio</div>
              <div style={ruleLineStyle}>🤝 Empate divide entre os líderes</div>
            </div>
          </div>

          <div style={infoCardStyle}>
            <div style={cardHeadingStyle}>Detalhes</div>
            <DetailRow label="Início" value={formattedStart} />
            <DetailRow label="Fim" value={formattedEnd} />
            <DetailRow label="Colaboração via Pix" value={formatBRL(collab)} />
            <DetailRow label="Taxa da plataforma" value={formatBRL(fee)} last />
          </div>

          <div style={infoCardStyle}>
            <div style={cardHeadingStyle}>A turma</div>
            <WaitingRoomList participants={turmaParticipants} />
          </div>

          <div style={infoCardStyle}>
            <div style={cardHeadingStyle}>Sua sequência</div>
            <StreakGrid streak={myStreak} />
          </div>
        </div>

        {/* Column 2 — hoje + feed */}
        <div style={{ flex: '2 1 420px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ ...cardHeadingStyle, marginBottom: 10 }}>Hoje</div>
            <EvidenceUploadCard
              challengeId={challenge.id}
              isPaid={myParticipant?.status === 'PAID'}
              todayEvidence={todayEvidence}
              onUploaded={() => {
                void queryClient.invalidateQueries({ queryKey: ['evidence-today', challengeId] });
                // D-09: same immediate-invalidation pattern as the mobile
                // Hoje tab — the acting user's own streak feeds RANK-03.
                void queryClient.invalidateQueries({ queryKey: ['ranking', challengeId] });
              }}
            />
          </div>

          <div style={infoCardStyle}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ ...cardHeadingStyle, marginBottom: 0 }}>Feed da turma — hoje</div>
              <button type="button" onClick={() => setPanel('feed')} style={linkButtonStyle}>
                Ver feed completo →
              </button>
            </div>

            {feedPreviewItems.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                Ninguém postou ainda hoje.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {feedPreviewItems.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: 18,
                      padding: 14,
                      display: 'flex',
                      gap: 14,
                    }}
                  >
                    <img
                      src={`${R2_PUBLIC_BASE_URL}/${encodeURIComponent(item.objectKey)}`}
                      alt={`Evidência de ${item.name}`}
                      style={{ width: 150, height: 112, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={avatarSmallStyle}>{initialsOf(item.name)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.name}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--muted)' }}>
                            {item.timeLabel}
                          </div>
                        </div>
                      </div>
                      <EvidenceStatusBadge status={item.badgeStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 3 — ranking (compact) + Votação aberta teaser */}
        <div
          style={{
            flex: '1 1 300px',
            minWidth: 280,
            maxWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={infoCardStyle}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ ...cardHeadingStyle, marginBottom: 0 }}>Ranking</div>
              <button type="button" onClick={() => setPanel('ranking')} style={linkButtonStyle}>
                Ver placar completo →
              </button>
            </div>
            {ranking && <RankingList ranking={ranking} />}
          </div>

          {votableCount > 0 && (
            <div style={{ background: 'var(--mint)', borderRadius: 18, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--green-ink)' }}>
                🗳️ {votableCount} evidências esperando seu voto
              </div>
              {formattedVoteDeadline && (
                <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
                  Janela fecha hoje às {formattedVoteDeadline}
                </div>
              )}
              <button type="button" onClick={() => setPanel('votar')} style={{ ...linkButtonStyle, marginTop: 10 }}>
                Votar agora →
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {panel === 'votar' && (
        <DesktopVotarPanel
          isLoading={isVotableLoading}
          isError={isVotableError}
          evidences={votableEvidences}
          votingEvidenceId={votingEvidenceId}
          onVote={handleVote}
          onRetry={() => void refetchVotable()}
          voteDeadlineLabel={formattedVoteDeadline}
          challengeId={challenge.id}
          isPaid={myParticipant?.status === 'PAID'}
          todayEvidence={todayEvidence}
          onUploaded={() => {
            void queryClient.invalidateQueries({ queryKey: ['evidence-today', challengeId] });
            void queryClient.invalidateQueries({ queryKey: ['ranking', challengeId] });
          }}
          ranking={ranking}
          myStreak={myStreak}
        />
      )}

      {panel === 'feed' && (
        <DesktopFeedPanel
          challengeTitle={challenge.title}
          dayOfChallenge={dayOfChallenge}
          durationDays={challenge.durationDays}
          todayEvidence={todayEvidence}
          votableEvidences={votableEvidences}
          userName={user?.name}
          onBackToDefault={() => setPanel('default')}
        />
      )}

      {panel === 'ranking' && <DesktopRankingPanel isLoading={isRankingLoading} ranking={ranking} />}
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

/**
 * DesktopVotarPanel — the "votar" panel expansion (CHALW-02, D-02). Pure
 * render-switch over the SAME votable-evidences query the mobile VotarPanel
 * reads (isError/refetch extended above); owns no query of its own. Does
 * not touch VotarPanel or its copy (D-12 mobile non-regression).
 */
interface DesktopVotarPanelProps {
  isLoading: boolean;
  isError: boolean;
  evidences: VoteCardEvidence[] | undefined;
  votingEvidenceId: string | null;
  onVote: (evidenceId: string, value: VoteValue) => void;
  onRetry: () => void;
  voteDeadlineLabel: string | null;
  challengeId: string;
  isPaid: boolean;
  todayEvidence: (TodayEvidence & { postedAt?: string }) | null | undefined;
  onUploaded: () => void;
  ranking: RankingData | undefined;
  myStreak: StreakCellState[];
}

function DesktopVotarPanel({
  isLoading,
  isError,
  evidences,
  votingEvidenceId,
  onVote,
  onRetry,
  voteDeadlineLabel,
  challengeId,
  isPaid,
  todayEvidence,
  onUploaded,
  ranking,
  myStreak,
}: DesktopVotarPanelProps) {
  const evidenceCount = evidences?.length ?? 0;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
      <div style={{ flex: '3 1 480px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ ...cardHeadingStyle, marginBottom: 10 }}>Hoje — evidência enviada</div>
          <EvidenceUploadCard
            challengeId={challengeId}
            isPaid={isPaid}
            todayEvidence={todayEvidence}
            onUploaded={onUploaded}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ ...cardHeadingStyle, marginBottom: 0 }}>Votar ({evidenceCount})</div>
            {voteDeadlineLabel && (
              <span
                style={{
                  background: 'var(--mint)',
                  color: 'var(--green-ink)',
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '5px 12px',
                }}
              >
                ⏳ Janela fecha hoje às {voteDeadlineLabel}
              </span>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 22,
                  height: 22,
                  border: '3px solid var(--mint-deep)',
                  borderTopColor: 'var(--green)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            </div>
          ) : isError ? (
            <div
              style={{
                background: 'var(--card)',
                border: '2px solid var(--coral)',
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
                Não deu pra registrar seu voto
              </div>
              <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem', margin: '0 0 14px' }}>
                Confira sua conexão e tente de novo. Seu voto não foi contado.
              </p>
              <button
                type="button"
                onClick={onRetry}
                style={{
                  background: 'none',
                  border: '2px solid var(--coral)',
                  borderRadius: 14,
                  color: 'var(--coral)',
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  padding: '10px 18px',
                  cursor: 'pointer',
                }}
              >
                Tentar de novo
              </button>
            </div>
          ) : evidenceCount === 0 ? (
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
                Tudo votado por hoje!
              </div>
              <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                Quando a turma postar novas evidências, elas aparecem aqui pra você validar.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 14,
                alignItems: 'start',
              }}
            >
              {(evidences ?? []).map((evidence) => (
                <VoteCard
                  key={evidence.id}
                  evidence={evidence}
                  isVoting={votingEvidenceId === evidence.id}
                  onVote={(value) => onVote(evidence.id, value)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: '1 1 300px', minWidth: 280, maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={infoCardStyle}>
          <div style={cardHeadingStyle}>Ranking</div>
          {ranking && <RankingList ranking={ranking} />}
        </div>
        <div style={infoCardStyle}>
          <div style={cardHeadingStyle}>Sua sequência</div>
          <StreakGrid streak={myStreak} />
        </div>
      </div>
    </div>
  );
}

/**
 * DesktopFeedPanel — the "feed" panel expansion (CHALW-03, D-05/D-06). Full
 * today gallery: own evidence + others', ANY status, no day grouping — the
 * full-day gallery that distinguishes this panel from DesktopVotarPanel's
 * actionable slice. Reuses `buildFeedItems` (module-level, shared with the
 * default panel's 3-item preview) so the "no status filter" combine logic
 * lives in exactly one place.
 */
interface DesktopFeedPanelProps {
  challengeTitle: string;
  dayOfChallenge: number;
  durationDays: number;
  todayEvidence: (TodayEvidence & { postedAt?: string }) | null | undefined;
  votableEvidences: VoteCardEvidence[] | undefined;
  userName: string | undefined;
  onBackToDefault: () => void;
}

function DesktopFeedPanel({
  challengeTitle,
  dayOfChallenge,
  durationDays,
  todayEvidence,
  votableEvidences,
  userName,
  onBackToDefault,
}: DesktopFeedPanelProps) {
  const items = buildFeedItems(todayEvidence, votableEvidences, userName);

  return (
    <div>
      <h1
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: '1.9rem',
          lineHeight: 1.1,
          color: 'var(--ink)',
          margin: '0 0 6px',
        }}
      >
        Feed de evidências
      </h1>
      <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--muted)', margin: '0 0 20px' }}>
        {challengeTitle} · Dia {dayOfChallenge} de {durationDays} · a turma valida por voto em até 24h
      </p>

      {items.length === 0 ? (
        <div
          style={{
            border: '2px dashed var(--mint-deep)',
            borderRadius: 18,
            padding: '36px 22px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📷</div>
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--ink)',
              marginBottom: 6,
            }}
          >
            Ninguém postou ainda hoje
          </div>
          <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem', margin: '0 0 16px' }}>
            Seja quem mostra serviço primeiro.
          </p>
          <PrimaryButton onClick={onBackToDefault}>Postar minha evidência</PrimaryButton>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {items.map((item) => (
            <div
              key={item.key}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 18,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <img
                src={`${R2_PUBLIC_BASE_URL}/${encodeURIComponent(item.objectKey)}`}
                alt={`Evidência de ${item.name}`}
                style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 14, display: 'block' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={avatarSmallStyle}>{initialsOf(item.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--muted)' }}>{item.timeLabel}</div>
                </div>
              </div>
              <EvidenceStatusBadge status={item.badgeStatus} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * DesktopRankingPanel — the "ranking" panel expansion (CHALW-04, D-03).
 * Leader banner (trailing-streak count derived client-side from the loaded
 * ranking data) + Classificação (RankingList reused verbatim) +
 * Consistência (StreakGrid sliced to the last 7 cells per participant). No
 * new endpoint — reads only the route's existing `ranking` query.
 */
interface DesktopRankingPanelProps {
  isLoading: boolean;
  ranking: RankingData | undefined;
}

/** Counts consecutive 'cumprido' cells from the END of a streak array,
 * stopping at the first non-'cumprido' cell — client-side "sequência de N
 * dias" (no backend field for this, per UI-SPEC). */
function countTrailingCumprido(streak: StreakCellState[]): number {
  let count = 0;
  for (let i = streak.length - 1; i >= 0; i--) {
    if (streak[i] !== 'cumprido') break;
    count++;
  }
  return count;
}

function DesktopRankingPanel({ isLoading, ranking }: DesktopRankingPanelProps) {
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
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (!ranking) {
    return null;
  }

  const leaderName = ranking.leaders[0];
  const leader = leaderName ? ranking.participants.find((p) => p.name === leaderName) : undefined;
  const streakCount = leader ? countTrailingCumprido(leader.streak) : 0;
  const formattedPrize = parseFloat(ranking.prize).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div>
      <h1
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: '1.9rem',
          lineHeight: 1.1,
          color: 'var(--ink)',
          margin: '0 0 6px',
        }}
      >
        Ranking
      </h1>
      <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--muted)', margin: '0 0 20px' }}>
        Atualiza conforme as evidências são validadas pela turma
      </p>

      {leader && (
        <div
          style={{
            background: 'var(--mint)',
            borderRadius: 22,
            padding: '22px 26px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 22,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            🏆
          </span>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--green)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--card)',
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            {initialsOf(leader.name)}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: '1.2rem',
                color: 'var(--green-ink)',
              }}
            >
              {leader.name} tá na frente!
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--green-ink)', marginTop: 2 }}>
              {leader.validatedDays} de {leader.durationDays} dias validados · sequência de {streakCount} dias
            </div>
          </div>
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 16,
              padding: '12px 20px',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            <div
              style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--green-ink)' }}
            >
              Prêmio em jogo
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
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 420px', minWidth: 340 }}>
          <div style={infoCardStyle}>
            <div style={cardHeadingStyle}>Classificação</div>
            <RankingList ranking={ranking} />
          </div>
        </div>
        <div style={{ flex: '1 1 420px', minWidth: 340 }}>
          <div style={infoCardStyle}>
            <div style={cardHeadingStyle}>Consistência da turma — últimos 7 dias</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ranking.participants.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--green)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--card)',
                      fontFamily: '"Baloo 2", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      flexShrink: 0,
                    }}
                  >
                    {initialsOf(p.name)}
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: 'var(--ink)',
                      width: 120,
                      flexShrink: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </div>
                  <StreakGrid streak={p.streak.slice(-7)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
