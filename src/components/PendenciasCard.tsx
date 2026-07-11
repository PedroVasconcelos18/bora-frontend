import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import type { TodayEvidence } from './EvidenceUploadCard';
import type { VoteCardEvidence } from './VoteCard';

/**
 * PendenciasCard — the "Pendências de hoje" web dashboard column (DASH-01,
 * D-07/D-08). Purely client-side fan-out over EXISTING v1.0 endpoints:
 *   - GET /challenges (already fetched by home.tsx, passed in as a prop)
 *   - GET /challenges/:id/evidences/today (per ACTIVE challenge)
 *   - GET /challenges/:id/evidences        (per ACTIVE challenge)
 * No new endpoint, no "Convites" section (D-08 — there is no
 * list-my-invites endpoint to feed it). Query keys reuse the SAME cache
 * entries `$challengeId.tsx` already uses, so navigating into a challenge
 * from here hits a warm cache.
 */

interface Participant {
  id: string;
  user: { id: string; name: string; email: string };
  status: string;
}

interface Challenge {
  id: string;
  title: string;
  emoji: string;
  status: string;
  participants: Participant[];
}

interface PendenciasCardProps {
  challenges: Challenge[];
}

interface PendenciaRow {
  key: string;
  icon: string;
  text: string;
  subLine?: string;
  actionLabel: string;
  challengeId: string;
}

export function PendenciasCard({ challenges }: PendenciasCardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const activeChallenges = challenges.filter((c) => c.status === 'ACTIVE');

  // useQueries (not a dynamic .map of useQuery) — the number of ACTIVE
  // challenges is dynamic, so a variable-length list of useQuery calls
  // would violate the rules of hooks. useQueries keeps hook identity stable
  // and lets this component aggregate the results below.
  const todayQueries = useQueries({
    queries: activeChallenges.map((c) => ({
      queryKey: ['evidence-today', c.id],
      queryFn: async () => {
        const res = await apiClient.get(`/challenges/${c.id}/evidences/today`);
        if (!res.ok) throw new Error('evidence-today-error');
        return (await res.json()) as TodayEvidence | null;
      },
    })),
  });

  const votableQueries = useQueries({
    queries: activeChallenges.map((c) => ({
      queryKey: ['votable-evidences', c.id],
      queryFn: async () => {
        const res = await apiClient.get(`/challenges/${c.id}/evidences`);
        if (!res.ok) throw new Error('votable-evidences-error');
        return (await res.json()) as VoteCardEvidence[];
      },
    })),
  });

  const rows: PendenciaRow[] = [];

  // Priority 1 — payment pending (WAITING challenges where the caller's own
  // Participant row is not yet PAID).
  challenges
    .filter((c) => c.status === 'WAITING')
    .forEach((c) => {
      const mine = user ? c.participants.find((p) => p.user.id === user.id) : undefined;
      if (mine && mine.status !== 'PAID') {
        rows.push({
          key: `pay-${c.id}`,
          icon: '💳',
          text: `Falta pagar sua entrada em ${c.title}`,
          actionLabel: 'Pagar agora →',
          challengeId: c.id,
        });
      }
    });

  // Priority 2 — evidence not posted today (ACTIVE challenges).
  activeChallenges.forEach((c, i) => {
    const today = todayQueries[i]?.data;
    if (today === null) {
      const suffix = activeChallenges.length > 1 ? ` ${c.emoji} ${c.title}` : '';
      rows.push({
        key: `evidence-${c.id}`,
        icon: '📸',
        text: `Você ainda não postou a evidência de hoje${suffix}`,
        actionLabel: 'Postar agora →',
        challengeId: c.id,
      });
    }
  });

  // Priority 3 — votes pending (ACTIVE challenges).
  activeChallenges.forEach((c, i) => {
    const votable = votableQueries[i]?.data;
    if (votable && votable.length > 0) {
      const earliestCloseMs = votable.reduce((min, ev) => {
        const closesAtMs = new Date(ev.windowClosesAt).getTime();
        return closesAtMs < min ? closesAtMs : min;
      }, Infinity);
      const hour = Number.isFinite(earliestCloseMs)
        ? new Date(earliestCloseMs).getHours()
        : null;
      rows.push({
        key: `votes-${c.id}`,
        icon: '🗳️',
        text: `${votable.length} evidências esperando seu voto`,
        subLine: hour !== null ? `Janela fecha hoje às ${hour}h` : undefined,
        actionLabel: 'Votar agora →',
        challengeId: c.id,
      });
    }
  });

  const goToChallenge = (challengeId: string) =>
    void navigate({ to: '/challenges/$challengeId', params: { challengeId } });

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: 20,
      }}
    >
      <h2
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.05rem',
          color: 'var(--ink)',
          marginBottom: 14,
        }}
      >
        Pendências de hoje
      </h2>

      {rows.length === 0 ? (
        <div
          style={{
            background: 'var(--mint)',
            borderRadius: 14,
            padding: 14,
            color: 'var(--green-ink)',
            fontWeight: 700,
            fontSize: '0.88rem',
          }}
        >
          ✓ Tudo em dia por aqui
        </div>
      ) : (
        <div>
          {rows.map((row, idx) => (
            <div
              key={row.key}
              style={{
                paddingBottom: 12,
                marginBottom: idx === rows.length - 1 ? 0 : 12,
                borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--line)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>
                {row.icon} {row.text}
              </div>
              {row.subLine && (
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                  {row.subLine}
                </div>
              )}
              <button
                type="button"
                onClick={() => goToChallenge(row.challengeId)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  marginTop: 4,
                  color: 'var(--green)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                {row.actionLabel}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
