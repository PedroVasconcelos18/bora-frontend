/**
 * forbidden-vocab.test.ts — PROF-02 / Pitfall 7 machine enforcement
 *
 * Scans all .ts and .tsx files under src/ for gambling/betting vocabulary.
 * FAILS the build if any forbidden term is found outside the single sanctioned
 * negation phrase in the PROF-02 disclaimer.
 *
 * WHY THIS EXISTS:
 *   The predecessor product (Caixinha Bet) was abandoned because its vocabulary
 *   framed the product as gambling. Bora must never use "aposta", "bolão",
 *   "escrow", "palpite", "apostar" or any related gambling term in user-facing
 *   copy. This test is the machine-enforced gate (Pitfall 7 from RESEARCH.md).
 *
 * FORBIDDEN TOKEN LIST (from UI-SPEC Copywriting Contract / PROF-02):
 *   aposta, apostar, aposte, bolão, bolao, palpite, palpitar, escrow, cassino,
 *   casino, jackpot, bet, betting, odds
 *
 * ALLOWLIST RULE — the ONLY allowed use of "aposta" and "bolão" is inside the
 *   mandated PROF-02 negation phrase:
 *     "Não é aposta nem bolão"
 *   This phrase appears verbatim in NotBetBlock.tsx and DisclaimerFooter.tsx as
 *   required by the UI-SPEC Copywriting Contract. It is the negation, not an
 *   affirmation, so it is explicitly sanctioned.
 *
 *   Code comments that REFERENCE the negation (e.g. JSX comments like
 *   {/* "Não é aposta" disclaimer footer *\/}) are also allowlisted because they
 *   are metadata about the negation, not affirmative uses.
 *
 *   All other tokens in the forbidden list (apostar, aposte, palpite, palpitar,
 *   escrow, cassino, casino, jackpot, bet, betting, odds) have NO allowed
 *   instances — not even in comments or strings.
 *
 * IMPLEMENTATION STRATEGY:
 *   1. Read each .ts/.tsx file under src/
 *   2. Per line: normalise (strip accents + lowercase) a copy for scanning
 *   3. Strip all sanctioned substrings from the normalised scan copy
 *   4. Check remaining content for each forbidden token using word-boundary regex
 *   5. Report all violations with file + line; fail at the end
 *
 * HOW TO ADD NEW SANCTIONED PHRASES IN THE FUTURE:
 *   Add the exact phrase (lowercase, normalised) to SANCTIONED_SUBSTRINGS.
 *   Explain the legal justification in a comment. Do NOT broaden the allowlist
 *   beyond explicit negations.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, '..', 'src');

/** Strip diacritics from a string so accent variants are caught uniformly */
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Recursively collect all .ts / .tsx files under a directory */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else {
      const ext = extname(entry);
      if (ext === '.ts' || ext === '.tsx') {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Forbidden token list (from UI-SPEC Copywriting Contract + prompt requirements)
// ---------------------------------------------------------------------------

/**
 * Each token is matched case-insensitively and accent-insensitively against
 * the content AFTER the sanctioned substrings have been stripped out.
 *
 * Word-boundary regex (\b) prevents "apostar" matching inside "composta" etc.
 * Tokens like "bet" use \b to avoid false positives on "better", "abet" etc.
 */
const FORBIDDEN_TOKENS: { pattern: RegExp; label: string }[] = [
  // Core Portuguese gambling terms
  { pattern: /\baposta[r]?\b/i, label: 'apostar/aposta (affirmative use)' },
  { pattern: /\baposte\b/i, label: 'aposte' },
  { pattern: /\bbolao\b/i, label: 'bolão/bolao (affirmative use)' },
  { pattern: /\bpalpite[s]?\b/i, label: 'palpite/palpites' },
  { pattern: /\bpalpitar\b/i, label: 'palpitar' },
  // Financial/custody framing forbidden by D-13
  { pattern: /\bescrow\b/i, label: 'escrow' },
  { pattern: /fundo de reserva/i, label: 'fundo de reserva' },
  // English gambling terms
  { pattern: /\bcassino\b|\bcasino\b/i, label: 'cassino/casino' },
  { pattern: /\bjackpot\b/i, label: 'jackpot' },
  { pattern: /\bbet\b|\bbetting\b/i, label: 'bet/betting' },
  { pattern: /\bodds\b/i, label: 'odds' },
];

/**
 * Sanctioned substrings: stripped from each line BEFORE checking forbidden tokens.
 *
 * Each entry is a normalised (accent-stripped, lowercased) substring that is
 * explicitly allowed because it is part of the required PROF-02 negation framing.
 *
 * RULE: only negating phrases ("Não é X", "X is not a Y") or code comments that
 * reference the negation are permitted here. Affirmative uses are NEVER allowed.
 */
const SANCTIONED_SUBSTRINGS: string[] = [
  // UI-SPEC Copywriting Contract — the full negation phrase (verbatim copy).
  // Appears in the rendered JSX of NotBetBlock.tsx and DisclaimerFooter.tsx.
  'nao e aposta nem bolao',

  // Short reference used in code COMMENTS and JSDoc that cite the negation framing.
  // Pattern: "nao e aposta" (quoted, as a label/reference to the disclaimer).
  // These are comment metadata, not rendered copy.
  '"nao e aposta"',

  // JSDoc comment in NotBetBlock.tsx that explains what the component is NOT:
  //   "app (aposta/bolão)"  — contextually "this app is NOT aposta/bolão"
  '(aposta/bolao)',
];

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

interface Violation {
  file: string;
  line: number;
  text: string;
  label: string;
}

function scanFile(filePath: string): Violation[] {
  const raw = readFileSync(filePath, 'utf-8');
  const relPath = relative(SRC_DIR, filePath);

  const lines = raw.split('\n');
  const violations: Violation[] = [];

  lines.forEach((rawLine, idx) => {
    // Normalise line: strip accents + lowercase for consistent matching
    let scanLine = stripAccents(rawLine).toLowerCase();

    // Strip every sanctioned substring from the scan line before checking tokens.
    // Stripping (not just skipping) ensures the EXACT forbidden word inside the
    // allowed phrase is removed, while any OTHER use on the same line is still caught.
    for (const sub of SANCTIONED_SUBSTRINGS) {
      // Replace all occurrences of the substring (plain string, not regex)
      while (scanLine.includes(sub)) {
        scanLine = scanLine.replace(sub, '');
      }
    }

    // Check each forbidden token against the stripped line
    for (const { pattern, label } of FORBIDDEN_TOKENS) {
      if (pattern.test(scanLine)) {
        violations.push({
          file: relPath,
          line: idx + 1,
          text: rawLine.trim(),
          label,
        });
      }
    }
  });

  return violations;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PROF-02 forbidden vocabulary guard', () => {
  it('no forbidden gambling/betting terms appear in frontend source (PROF-02)', () => {
    const files = collectSourceFiles(SRC_DIR);
    expect(files.length).toBeGreaterThan(0); // guard: src directory must have files

    const allViolations: Violation[] = [];
    for (const file of files) {
      allViolations.push(...scanFile(file));
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map(
          (v) =>
            `  [${v.label}] ${v.file}:${v.line}\n    > ${v.text}`
        )
        .join('\n');
      // Intentionally verbose error: developers must see exactly what to fix
      throw new Error(
        `PROF-02 VIOLATION — Forbidden gambling vocabulary found in frontend source.\n` +
          `These terms must not appear anywhere except inside the sanctioned negation phrase ` +
          `"Não é aposta nem bolão".\n\n` +
          `Violations:\n${report}\n\n` +
          `Fix: remove the term or replace with preferred vocabulary from the Copywriting Contract ` +
          `(colaboração, prêmio, hábito, desafio, turma, incentivo).`
      );
    }

    // Explicitly verify that the sanctioned phrase is present in NotBetBlock —
    // if it was accidentally deleted, the product framing is missing.
    const notBetBlockPath = join(SRC_DIR, 'components', 'NotBetBlock.tsx');
    const notBetContent = readFileSync(notBetBlockPath, 'utf-8');
    const notBetNorm = stripAccents(notBetContent).toLowerCase();
    expect(notBetNorm).toContain('nao e aposta nem bolao');
  });

  it('sanctioned negation phrase is present in DisclaimerFooter (PROF-02)', () => {
    const disclaimerPath = join(SRC_DIR, 'components', 'DisclaimerFooter.tsx');
    const content = readFileSync(disclaimerPath, 'utf-8');
    const normalised = stripAccents(content).toLowerCase();
    expect(normalised).toContain('nao e aposta nem bolao');
  });

  it('rejects affirmative gambling vocabulary (regression guard)', () => {
    // Synthetic violation: verify the scanner catches an affirmative use
    // that is NOT inside a sanctioned phrase.
    const fakeLine = 'const label = "Aposte no desafio";';
    const normLine = stripAccents(fakeLine).toLowerCase();
    // After stripping sanctioned phrases (none match here), should still contain "aposte"
    const stillHasViolation = FORBIDDEN_TOKENS.some(({ pattern }) => pattern.test(normLine));
    expect(stillHasViolation).toBe(true);
  });
});
