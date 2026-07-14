/**
 * challenge-limits.ts — single source of truth for create-challenge form
 * limits (min/max, +/- step, submit validation).
 *
 * Both layouts of new.tsx (mobile and web) duplicate the same fields, and
 * the backend's CreateChallengeDto enforces the same rules independently
 * (backend is the authority; this module is UX). Keeping the numbers and
 * pt-BR copy here — instead of inlined twice in new.tsx — means a change
 * only happens in one place, and this module is covered by a plain vitest
 * spec with no jsdom/@testing-library needed (test/*.test.ts run in the
 * node environment, same spirit as lib/prize.ts + test/prize.test.ts).
 *
 * Pure module — no React.
 */

/** Numeric bounds + step for every limited field in the create-challenge form. */
export const CHALLENGE_LIMITS = {
  durationDays: { min: 3, max: 365 },
  collabAmount: { min: 5, max: 200, step: 5 },
  // invitees.max = maxParticipants - 1: o criador ocupa uma das 10 vagas,
  // então o teto de convidados é 9, não 10.
  invitees: { min: 2, max: 9 },
  maxParticipants: 10,
} as const;

/** pt-BR copy — identical strings to CreateChallengeDto (backend Task 1). */
export const LIMIT_MESSAGES = {
  titleRequired: 'Dá um nome pro desafio 🙂',
  durationMin: 'A duração mínima é de 3 dias.',
  durationMax: 'A duração máxima é de 365 dias.',
  collabMin: 'A colaboração mínima é R$ 5.',
  collabMax: 'A colaboração máxima é R$ 200.',
  inviteesMin: 'Convide pelo menos 2 amigos (mínimo de 3 pessoas).',
  inviteesMax: 'O desafio aceita no máximo 10 pessoas — convide até 9 amigos.',
} as const;

/**
 * Step the collaboration amount by one increment (+1) or decrement (-1),
 * clamped to [min, max]. Non-finite input (empty number field → NaN from
 * react-hook-form's valueAsNumber) resolves to the floor, never NaN.
 */
export function stepCollab(current: number, direction: 1 | -1): number {
  const { min, max, step } = CHALLENGE_LIMITS.collabAmount;
  if (!Number.isFinite(current)) {
    return min;
  }
  const next = current + direction * step;
  return Math.min(max, Math.max(min, next));
}

interface ChallengeFormInput {
  title: string;
  durationDays: number;
  collabAmount: number;
  invitees: string[];
}

/**
 * Validate the create-challenge form payload against every limit (min and
 * max). Returns the first violated pt-BR message, or null when the payload
 * is valid — including at the exact boundary (duration 365, collab 200,
 * 9 invitees).
 */
export function validateChallengeForm(input: ChallengeFormInput): string | null {
  const { title, durationDays, collabAmount, invitees } = input;

  if (!title.trim()) {
    return LIMIT_MESSAGES.titleRequired;
  }
  if (!Number.isFinite(durationDays) || durationDays < CHALLENGE_LIMITS.durationDays.min) {
    return LIMIT_MESSAGES.durationMin;
  }
  if (durationDays > CHALLENGE_LIMITS.durationDays.max) {
    return LIMIT_MESSAGES.durationMax;
  }
  if (!Number.isFinite(collabAmount) || collabAmount < CHALLENGE_LIMITS.collabAmount.min) {
    return LIMIT_MESSAGES.collabMin;
  }
  if (collabAmount > CHALLENGE_LIMITS.collabAmount.max) {
    return LIMIT_MESSAGES.collabMax;
  }
  if (invitees.length < CHALLENGE_LIMITS.invitees.min) {
    return LIMIT_MESSAGES.inviteesMin;
  }
  if (invitees.length > CHALLENGE_LIMITS.invitees.max) {
    return LIMIT_MESSAGES.inviteesMax;
  }

  return null;
}
