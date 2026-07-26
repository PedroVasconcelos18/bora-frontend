/**
 * StreakGrid — per-participant habit-tracker grid (RANK-03, D-10).
 *
 * One fixed 34x34px cell per day of the challenge, mirroring StatusPill's
 * Record<state, config> lookup-table structure (UI-SPEC "Streak Grid"
 * component spec) instead of inline conditionals. Cells never shrink below
 * 34px — the row scrolls horizontally past ~9 cells instead.
 */

export type StreakCellState = 'cumprido' | 'falhou' | 'hoje' | 'futuro' | 'pending';

interface CellConfig {
  bg: string;
  color: string;
  glyph: string;
  border: string;
}

// 'pending' shares the 'hoje' visual family per RESEARCH.md Pitfall 2 — a
// past day whose evidence is still open must never render as falhou.
const CELL_CONFIG: Record<StreakCellState, CellConfig> = {
  cumprido: { bg: 'var(--green-bright)', color: 'var(--green-ink)', glyph: '✓', border: 'none' },
  falhou: { bg: '#FFE2DA', color: 'var(--coral)', glyph: '✕', border: 'none' },
  hoje: { bg: 'var(--mint)', color: 'var(--green-ink)', glyph: '⏳', border: '2px dashed var(--green)' },
  pending: { bg: 'var(--mint)', color: 'var(--green-ink)', glyph: '⏳', border: '2px dashed var(--green)' },
  futuro: { bg: 'transparent', color: 'var(--muted)', glyph: '', border: '1px dashed var(--line)' },
};

const CELL_STATE_LABEL: Record<StreakCellState, string> = {
  cumprido: 'cumprido',
  falhou: 'falhou',
  hoje: 'é hoje',
  pending: 'em votação',
  futuro: 'a seguir',
};

interface StreakGridProps {
  streak: StreakCellState[];
}

export function StreakGrid({ streak }: StreakGridProps) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>
        ✓ cumprido · ✗ falhou · hoje · a seguir
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {streak.map((state, idx) => {
          const config = CELL_CONFIG[state];
          // Sem rótulo, a célula não diz QUAL dia representa — o número vai no
          // title/aria-label (a leitura explícita fica na EvidenceDayList).
          const dayLabel = `Dia ${idx + 1} de ${streak.length} — ${CELL_STATE_LABEL[state]}`;
          return (
            <div
              key={idx}
              title={dayLabel}
              aria-label={dayLabel}
              style={{
                width: 34,
                height: 34,
                minWidth: 34,
                flexShrink: 0,
                borderRadius: 10,
                background: config.bg,
                border: config.border,
                color: config.color,
                opacity: state === 'futuro' ? 0.6 : 1,
                display: 'grid',
                placeItems: 'center',
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {config.glyph}
            </div>
          );
        })}
      </div>
    </div>
  );
}
