/**
 * RankingList — the "Ranking" tab (RANK-01/02/04, D-11).
 *
 * Renders the server-sorted (validatedDays desc) participant rows with a
 * progress bar, a per-participant StreakGrid, and a prize-note block that
 * reuses PrizeCalculator's visual shell. The prize/leaders values always
 * come from the RankingService response — this component never recomputes
 * (N x collab) - fee client-side (M4 precedent, RANK-02).
 */
import { StreakGrid, type StreakCellState } from './StreakGrid';

export interface RankingParticipant {
  id: string;
  name: string;
  validatedDays: number;
  durationDays: number;
  progress: number;
  isLeader: boolean;
  streak: StreakCellState[];
}

export interface RankingData {
  prize: string;
  leaders: string[];
  participants: RankingParticipant[];
}

interface RankingListProps {
  ranking: RankingData;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export function RankingList({ ranking }: RankingListProps) {
  const { prize, leaders, participants } = ranking;
  const isTie = leaders.length > 1;

  return (
    <div>
      {participants.map((p, idx) => {
        const initials = p.name
          .split(' ')
          .slice(0, 2)
          .map((n) => n[0])
          .join('')
          .toUpperCase();

        return (
          <div
            key={p.id}
            style={{
              padding: '10px 0',
              borderBottom: idx < participants.length - 1 ? '1px solid var(--line)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: p.isLeader ? 'var(--green-ink)' : 'var(--muted)',
                }}
              >
                {idx + 1}º
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {p.isLeader && <span aria-hidden="true">🏆</span>}
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    height: 8,
                    borderRadius: 999,
                    background: '#EEE9DD',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, p.progress * 100)}%`,
                      background: 'var(--green)',
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--ink)',
                }}
              >
                {p.validatedDays}/{p.durationDays} dias
              </div>
            </div>

            <div style={{ marginTop: 10, marginLeft: 38 }}>
              <StreakGrid streak={p.streak} />
            </div>
          </div>
        );
      })}

      <div
        style={{
          background: 'var(--mint)',
          borderRadius: 14,
          padding: 15,
          marginTop: 14,
          color: 'var(--green-ink)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
          }}
        >
          <span>Prêmio ao vivo</span>
          <b style={{ fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '1.2rem' }}>
            {formatBRL(parseFloat(prize))}
          </b>
        </div>
        {leaders.length > 0 && (
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', fontWeight: 600 }}>
            {isTie
              ? `🏆 ${formatNames(leaders)} empatam e dividiriam o prêmio igualmente.`
              : `🏆 ${formatNames(leaders)} levaria o prêmio se o desafio acabasse hoje.`}
          </p>
        )}
      </div>
    </div>
  );
}
