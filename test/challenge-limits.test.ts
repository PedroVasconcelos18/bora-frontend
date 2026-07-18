/**
 * challenge-limits.test.ts — DOM-free vitest for lib/challenge-limits.ts.
 *
 * Pins the exact boundary behaviour the create-challenge form (both
 * mobile and web layouts) depends on: stepCollab never leaves
 * [min, max] nor returns NaN, and validateChallengeForm returns null at
 * the exact upper boundary (365 / 200 / 9) while rejecting one step past
 * it (366 / 201 / 10).
 */

import { describe, it, expect } from 'vitest';
import { clamp, stepCollab, validateChallengeForm, LIMIT_MESSAGES } from '../src/lib/challenge-limits';

describe('clamp', () => {
  it('50 within [5,200] passes through unchanged', () => {
    expect(clamp(50, 5, 200)).toBe(50);
  });

  it('2 below the 3 floor snaps up to 3', () => {
    expect(clamp(2, 3, 365)).toBe(3);
  });

  it('400 above the 365 ceiling snaps down to 365', () => {
    expect(clamp(400, 3, 365)).toBe(365);
  });

  it('exact floor boundary (3) is preserved', () => {
    expect(clamp(3, 3, 365)).toBe(3);
  });

  it('exact ceiling boundary (365) is preserved', () => {
    expect(clamp(365, 3, 365)).toBe(365);
  });
});

describe('stepCollab', () => {
  it('50 + 1 step === 55', () => {
    expect(stepCollab(50, 1)).toBe(55);
  });

  it('50 - 1 step === 45', () => {
    expect(stepCollab(50, -1)).toBe(45);
  });

  it('198 + 1 step clamps at the 200 ceiling', () => {
    expect(stepCollab(198, 1)).toBe(200);
  });

  it('200 + 1 step stays at 200 (already at ceiling)', () => {
    expect(stepCollab(200, 1)).toBe(200);
  });

  it('12 - 1 step clamps at the 10 floor (never below the minimum)', () => {
    expect(stepCollab(12, -1)).toBe(10);
  });

  it('10 - 1 step stays at 10 (already at floor)', () => {
    expect(stepCollab(10, -1)).toBe(10);
  });

  it('NaN + 1 step resolves to the 10 floor (empty input never yields NaN)', () => {
    expect(stepCollab(NaN, 1)).toBe(10);
  });
});

describe('validateChallengeForm — valid boundary payload', () => {
  it('duration 365, collab 200, 9 invitees returns null', () => {
    const result = validateChallengeForm({
      title: 'Corrida',
      durationDays: 365,
      collabAmount: 200,
      invitees: Array.from({ length: 9 }, (_, i) => `friend${i}@x.com`),
    });
    expect(result).toBeNull();
  });
});

describe('validateChallengeForm — violations', () => {
  const validBase = {
    title: 'Corrida',
    durationDays: 14,
    collabAmount: 50,
    invitees: ['a@x.com', 'b@x.com'],
  };

  it('empty title returns the pt-BR title message', () => {
    expect(validateChallengeForm({ ...validBase, title: '  ' })).toBe(LIMIT_MESSAGES.titleRequired);
  });

  it('duration 2 returns the pt-BR minimum message', () => {
    expect(validateChallengeForm({ ...validBase, durationDays: 2 })).toBe(LIMIT_MESSAGES.durationMin);
  });

  it('duration 366 returns the pt-BR maximum message', () => {
    expect(validateChallengeForm({ ...validBase, durationDays: 366 })).toBe(LIMIT_MESSAGES.durationMax);
  });

  it('collab 4 returns the pt-BR minimum message', () => {
    expect(validateChallengeForm({ ...validBase, collabAmount: 4 })).toBe(LIMIT_MESSAGES.collabMin);
  });

  it('collab 201 returns the pt-BR maximum message', () => {
    expect(validateChallengeForm({ ...validBase, collabAmount: 201 })).toBe(LIMIT_MESSAGES.collabMax);
  });

  it('1 invitee returns the pt-BR minimum message', () => {
    expect(validateChallengeForm({ ...validBase, invitees: ['a@x.com'] })).toBe(LIMIT_MESSAGES.inviteesMin);
  });

  it('10 invitees returns the pt-BR maximum message', () => {
    const tenEmails = Array.from({ length: 10 }, (_, i) => `friend${i}@x.com`);
    expect(validateChallengeForm({ ...validBase, invitees: tenEmails })).toBe(LIMIT_MESSAGES.inviteesMax);
  });
});
