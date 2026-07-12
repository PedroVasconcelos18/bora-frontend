import { StatusPill } from './StatusPill';
import { computePrize, PLATFORM_FEE } from '../lib/prize';

/**
 * ChallengePreview — "Preview — como a turma vai ver" live card (D-08, FUN-04).
 *
 * Fed directly from react-hook-form `watch()` values in challenges/new.tsx —
 * no network call, re-renders on every keystroke. This is a simplified,
 * non-interactive variant of ChallengeCard (no <button>/hover/click
 * semantics — it's a decorative preview, the challenge does not exist yet).
 * D-08 explicitly permits this simplification if full ChallengeCard fidelity
 * is costly; a plain <div> avoids a clickable-looking element that does
 * nothing.
 *
 * `participantCount` and prize both come from `src/lib/prize.ts`, the same
 * module `PrizeCalculator` consumes — the two must never derive the same
 * quantity independently again (UAT gap 6).
 */

interface ChallengePreviewProps {
  title: string;
  emoji: string;
  durationDays: number;
  collabAmount: number;
  platformFee?: number;
  userName: string;
  participantCount: number;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function ChallengePreview({
  title,
  emoji,
  durationDays,
  collabAmount,
  platformFee = PLATFORM_FEE,
  userName,
  participantCount,
}: ChallengePreviewProps) {
  // The challenge does not exist yet, so the preview shows the INTENDED
  // turma (creator + invitees) — it must agree with PrizeCalculator, which
  // renders directly below it and derives from the same shared helper.
  const estimatedPrize = computePrize(participantCount, collabAmount, platformFee);

  return (
    <div>
      <div
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          marginBottom: 8,
        }}
      >
        Preview — como a turma vai ver
      </div>
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 20,
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: 'var(--mint)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.5rem',
              flexShrink: 0,
            }}
          >
            {emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '1.12rem',
                lineHeight: 1.15,
                color: 'var(--ink)',
              }}
            >
              {title.trim() || 'Seu desafio'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
              Aguardando · {durationDays || 0} dias · {participantCount} pessoa{participantCount !== 1 ? 's' : ''}
            </div>
          </div>

          <StatusPill status="WAITING" />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '2px solid var(--card)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--card)',
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '0.72rem',
              background: 'var(--green)',
            }}
          >
            {userName.trim()[0]?.toUpperCase() ?? '?'}
          </span>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.66rem',
                color: 'var(--muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              Prêmio
            </span>
            <span
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 800,
                color: 'var(--green-ink)',
                fontSize: '1rem',
              }}
            >
              {formatBRL(estimatedPrize)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
