/**
 * EvidenceDayList — a lista dia a dia do desafio na aba "Suas evidências".
 *
 * A StreakGrid resume a sequência em quadradinhos, mas não diz QUAL dia é cada
 * célula. Esta lista é a leitura explícita — "Dia 3/30 · 27/07 · ✓ cumprido" —
 * com a mesma derivação de estado do ranking (o array `streak` vem do servidor).
 */

import React from 'react';
import type { StreakCellState } from './StreakGrid';
import { challengeDayDates, formatSaoPauloShortDate, saoPauloDay } from '../lib/sao-paulo-day';

interface DayStateConfig {
  glyph: string;
  label: string;
  bg: string;
  color: string;
}

// Mesma paleta da StreakGrid — os dois componentes descrevem o mesmo estado.
const DAY_STATE: Record<StreakCellState, DayStateConfig> = {
  cumprido: { glyph: '✓', label: 'cumprido', bg: 'var(--green-bright)', color: 'var(--green-ink)' },
  falhou: { glyph: '✕', label: 'falhou', bg: '#FFE2DA', color: 'var(--coral)' },
  hoje: { glyph: '⏳', label: 'é hoje', bg: 'var(--mint)', color: 'var(--green-ink)' },
  pending: { glyph: '⏳', label: 'em votação', bg: 'var(--mint)', color: 'var(--green-ink)' },
  futuro: { glyph: '·', label: 'a seguir', bg: 'transparent', color: 'var(--muted)' },
};

interface EvidenceDayListProps {
  streak: StreakCellState[];
  /** Início do desafio (ISO). Sem ele a lista mostra só o número do dia. */
  startsAt?: string | null;
}

export function EvidenceDayList({ streak, startsAt }: EvidenceDayListProps) {
  if (streak.length === 0) return null;

  const total = streak.length;
  const dayDates = startsAt ? challengeDayDates(new Date(startsAt), total) : null;
  const today = saoPauloDay();

  return (
    <ul style={listStyle}>
      {streak.map((state, idx) => {
        const config = DAY_STATE[state];
        const date = dayDates?.[idx];
        const isToday = date ? saoPauloDay(date) === today : state === 'hoje';

        return (
          <li
            key={idx}
            style={{
              ...rowStyle,
              borderBottom: idx === total - 1 ? 'none' : '1px solid var(--line)',
              opacity: state === 'futuro' ? 0.55 : 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                ...glyphStyle,
                background: config.bg,
                color: config.color,
                border: state === 'futuro' ? '1px dashed var(--line)' : 'none',
              }}
            >
              {config.glyph}
            </span>
            <span style={dayNumberStyle}>
              Dia {idx + 1}/{total}
            </span>
            {date && <span style={dateStyle}>{formatSaoPauloShortDate(date)}</span>}
            <span style={{ ...stateLabelStyle, fontWeight: isToday ? 700 : 600 }}>{config.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  maxHeight: 320,
  overflowY: 'auto',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 2px',
};

const glyphStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  minWidth: 26,
  borderRadius: 8,
  display: 'grid',
  placeItems: 'center',
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.8rem',
};

const dayNumberStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.85rem',
  color: 'var(--ink)',
  minWidth: 78,
};

const dateStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--muted)',
  minWidth: 46,
};

const stateLabelStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  color: 'var(--muted)',
  marginLeft: 'auto',
};
