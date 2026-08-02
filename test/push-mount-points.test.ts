/**
 * push-mount-points.test.ts — source-contract test locking the mount count
 * and mode of `PushActivationCard` at its two remaining insertion points,
 * plus the two-mode union it still exposes.
 *
 * There is no DOM environment and no testing-library in this project (same
 * readFileSync + import.meta.url convention as `service-worker.test.ts` and
 * the `hooks/usePushPreferences.ts` describe in `push-preferences.test.ts`),
 * so this is a text + filesystem contract test, not a runtime test.
 *
 * WHY THIS EXISTS:
 *   This locks the decision of quick 260801-v15: the device liga/desliga
 *   switch moved out of `PushActivationCard mode="control"` and into the
 *   profile's notification-preferences section
 *   (`NotificationPreferencesSection.tsx`). `PushActivationCard` itself now
 *   only ever invites activation (`mode="invite"`) — insertion point 3 (the
 *   control-mode mount inside the challenge's 'hoje' tab) is gone, and
 *   insertion point 2 (challenge activation) no longer suppresses itself by
 *   tab. `PushActivationCard.tsx` was not modified by this plan: it still
 *   accepts both modes and still returns `null` on `denied`/`unsupported`
 *   (D-06) — a regression here (either mode disappearing from the type, or
 *   a `mode="control"` mount reappearing anywhere) is exactly what these
 *   assertions catch.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, '..', 'src');

describe('src/routes/challenges/$challengeId.tsx — PushActivationCard mount contract', () => {
  const source = readFileSync(join(SRC_DIR, 'routes', 'challenges', '$challengeId.tsx'), 'utf-8');

  it('mounts PushActivationCard exactly once', () => {
    const matches = source.match(/<PushActivationCard/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('the single mount is the invite mode', () => {
    expect(source).toContain('<PushActivationCard mode="invite" />');
  });

  it('no longer contains the control mode string', () => {
    expect(source).not.toContain('mode="control"');
  });
});

describe('src/routes/participants/pay.tsx — PushActivationCard mount contract', () => {
  const source = readFileSync(join(SRC_DIR, 'routes', 'participants', 'pay.tsx'), 'utf-8');

  it('mounts PushActivationCard exactly once', () => {
    const matches = source.match(/<PushActivationCard/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('the single mount is the invite mode', () => {
    expect(source).toContain('<PushActivationCard mode="invite" />');
  });
});

describe('src/components/PushActivationCard.tsx — untouched by this plan', () => {
  const source = readFileSync(join(SRC_DIR, 'components', 'PushActivationCard.tsx'), 'utf-8');

  it('still accepts both invite and control modes', () => {
    expect(source).toContain("export type PushActivationCardMode = 'invite' | 'control';");
  });

  it('still returns null on denied and unsupported (D-06)', () => {
    expect(source).toContain("if (state === 'denied' || state === 'unsupported') return null;");
  });
});
