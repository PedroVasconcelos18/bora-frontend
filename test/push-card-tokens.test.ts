/**
 * push-card-tokens.test.ts — WEB-05 guardrail (Phase 5 D-17) for Phase 11's
 * push-activation files, extended in Phase 12 to also cover the per-type
 * push-preference files (`NotificationPreferencesSection.tsx`,
 * `push-preferences.ts`, `usePushPreferences.ts`), and extended a third time
 * by quick 260802-fgr to cover the new challenge-entry invite modal
 * (`PushInviteModal.tsx`, `push-invite-modal.ts`).
 *
 * Mirrors forbidden-vocab.test.ts's file-reading approach: read each file
 * these phases added under `src/`, and assert none contains a raw hex colour
 * literal. `EvidenceStatusBadge.tsx`'s neutral state carries a grandfathered
 * raw hex (`#EEE9DD`) from before this guardrail existed — it is explicitly
 * NOT one of the files scanned here, and none of these phases' new files may
 * copy that hex in.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, '..', 'src');

/** Matches any CSS hex colour literal (#RGB, #RGBA, #RRGGBB, #RRGGBBAA). */
const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;

const FILES_TO_SCAN = [
  join(SRC_DIR, 'components', 'PushActivationCard.tsx'),
  join(SRC_DIR, 'hooks', 'usePushSubscription.ts'),
  join(SRC_DIR, 'lib', 'push.ts'),
  join(SRC_DIR, 'components', 'NotificationPreferencesSection.tsx'),
  join(SRC_DIR, 'lib', 'push-preferences.ts'),
  join(SRC_DIR, 'hooks', 'usePushPreferences.ts'),
  join(SRC_DIR, 'components', 'PushInviteModal.tsx'),
  join(SRC_DIR, 'lib', 'push-invite-modal.ts'),
];

describe('WEB-05 push-card token guardrail (Phase 5 D-17)', () => {
  it.each(FILES_TO_SCAN)('%s contains no raw hex colour literals', (filePath) => {
    const content = readFileSync(filePath, 'utf-8');
    const matches = content.match(HEX_COLOR_PATTERN) ?? [];

    if (matches.length > 0) {
      throw new Error(
        `WEB-05 VIOLATION — raw hex colour literal(s) found in ${filePath}: ${matches.join(', ')}\n` +
          `Every colour in this phase's new files must be a design-system custom property ` +
          `(var(--token-name)), not a literal hex value.`
      );
    }

    expect(matches.length).toBe(0);
  });
});
