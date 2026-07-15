import type { CSSProperties } from 'react';
import { stepCollab, CHALLENGE_LIMITS } from '../lib/challenge-limits';

interface CollabStepperProps {
  value: number;
  onChange: (next: number) => void;
  idSuffix?: string;
}

const baseButtonStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  border: '2px solid var(--line)',
  background: 'var(--mint)',
  color: 'var(--green-ink)',
  fontWeight: 800,
  fontSize: '1.1rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  lineHeight: 1,
  boxSizing: 'border-box',
};

const disabledButtonStyle: CSSProperties = {
  background: 'var(--card)',
  color: 'var(--muted)',
  cursor: 'not-allowed',
  borderColor: 'var(--line)',
};

/**
 * CollabStepper — +/- buttons for the collaboration amount field, stepping
 * by CHALLENGE_LIMITS.collabAmount.step and clamping at [min, max].
 *
 * Declared at module scope (not inside NewChallengePage) — an inline
 * component declared inside a parent remounts on every render, which would
 * make the number input lose focus on each keystroke.
 *
 * Renders both buttons as siblings of the input inside a shared flex
 * wrapper (see new.tsx). CSS `order` positions "−" before and "+" after
 * the input regardless of DOM order, so the input can sit visually between
 * the two buttons while still being a single self-closing <CollabStepper />
 * call in new.tsx.
 */
export function CollabStepper({ value, onChange, idSuffix }: CollabStepperProps) {
  const { min, max } = CHALLENGE_LIMITS.collabAmount;
  const isAtFloor = !Number.isFinite(value) || value <= min;
  const isAtCeiling = Number.isFinite(value) && value >= max;

  return (
    <>
      <button
        type="button"
        aria-label="Diminuir colaboração em R$ 5"
        disabled={isAtFloor}
        onClick={() => onChange(stepCollab(value, -1))}
        data-testid={idSuffix ? `collab-decrement-${idSuffix}` : 'collab-decrement'}
        style={{
          ...(isAtFloor ? { ...baseButtonStyle, ...disabledButtonStyle } : baseButtonStyle),
          order: -1,
        }}
      >
        −
      </button>
      <button
        type="button"
        aria-label="Aumentar colaboração em R$ 5"
        disabled={isAtCeiling}
        onClick={() => onChange(stepCollab(value, 1))}
        data-testid={idSuffix ? `collab-increment-${idSuffix}` : 'collab-increment'}
        style={{
          ...(isAtCeiling ? { ...baseButtonStyle, ...disabledButtonStyle } : baseButtonStyle),
          order: 1,
        }}
      >
        +
      </button>
    </>
  );
}
