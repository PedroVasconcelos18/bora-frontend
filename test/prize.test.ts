/**
 * prize.test.ts — DOM-free vitest for lib/prize.ts (UAT gap 6)
 *
 * Pins the exact numbers UAT observed as contradictory between the
 * create-challenge preview card and the PrizeCalculator: with 2 invitees
 * the card wrongly showed "1 pessoa" / R$ 40, while the calculator
 * correctly showed 3 participants / R$ 140. computePrice + parseInvitees
 * are now the single derivation both components consume.
 */

import { describe, it, expect } from 'vitest';
import { parseInvitees, computePrize, PLATFORM_FEE } from '../src/lib/prize';

describe('parseInvitees', () => {
  it('empty string yields zero invitees', () => {
    expect(parseInvitees('')).toEqual([]);
  });

  it('single email yields one entry', () => {
    expect(parseInvitees('a@x.com')).toEqual(['a@x.com']);
  });

  it('two newline-separated emails yield two entries', () => {
    expect(parseInvitees('a@x.com\nb@x.com')).toEqual(['a@x.com', 'b@x.com']);
  });

  it('blank lines and surrounding whitespace are trimmed away', () => {
    expect(parseInvitees('  a@x.com \n\n \n b@x.com\n')).toEqual(['a@x.com', 'b@x.com']);
  });
});

describe('computePrize', () => {
  it('(1, 50) → 40 — creator alone minus the platform fee (today\'s card output)', () => {
    expect(computePrize(1, 50)).toBe(40);
  });

  it('(3, 50) → 140 — creator + 2 invitees, matching the UAT-reported calculator value', () => {
    expect(computePrize(3, 50)).toBe(140);
  });

  it('(2, 50) → 90 — matches the calculator\'s observed value with 1 email', () => {
    expect(computePrize(2, 50)).toBe(90);
  });

  it('(1, 0) → 0 — clamped at zero, never negative', () => {
    expect(computePrize(1, 0)).toBe(0);
  });

  it('(1, 5) → 0 — a collab below the fee clamps to zero rather than going negative', () => {
    expect(computePrize(1, 5)).toBe(0);
  });

  it('defaults the platform fee to PLATFORM_FEE when not overridden', () => {
    expect(computePrize(1, 50)).toBe(50 - PLATFORM_FEE);
  });
});
