/**
 * prize.ts — shared invitee-parsing + prize-formula helpers (D-12/CHAL-02).
 *
 * Single source of truth for the derivation that both ChallengePreview
 * and PrizeCalculator need: parse the raw invitees textarea, then compute
 * the estimated prize from the resulting headcount. Before this module
 * existed, the parse was duplicated in PrizeCalculator.tsx and new.tsx,
 * and ChallengePreview hardcoded a 1-participant world entirely — the two
 * displayed cards silently drifted apart (UAT gap 6).
 *
 * Pure module — no React, no imports.
 */

/** Flat platform fee (R$) deducted once from the total collab pool. */
export const PLATFORM_FEE = 10;

/**
 * Parse the raw "one email per line" textarea into a clean list.
 * Splits on newline, trims each line, drops empty/blank lines.
 */
export function parseInvitees(emailsText: string): string[] {
  return emailsText
    .split('\n')
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Estimated prize: total collab pool across all participants, minus the
 * flat platform fee, clamped at zero (never negative).
 */
export function computePrize(
  participantCount: number,
  collabAmount: number,
  platformFee: number = PLATFORM_FEE,
): number {
  return Math.max(0, participantCount * collabAmount - platformFee);
}
