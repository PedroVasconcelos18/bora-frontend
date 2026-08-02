/**
 * push-mount-points.test.ts — source-contract test locking the mount count
 * and mode of `PushActivationCard` at its one remaining insertion point,
 * plus the two-mode union it still exposes, plus (quick 260802-fgr) the
 * challenge-entry modal that replaced its other insertion point.
 *
 * There is no DOM environment and no testing-library in this project (same
 * readFileSync + import.meta.url convention as `service-worker.test.ts` and
 * the `hooks/usePushPreferences.ts` describe in `push-preferences.test.ts`),
 * so this is a text + filesystem contract test, not a runtime test.
 *
 * WHY THIS EXISTS:
 *   This locks two decisions, one per quick task.
 *
 *   Quick 260801-v15: the device liga/desliga switch moved out of
 *   `PushActivationCard mode="control"` and into the profile's
 *   notification-preferences section (`NotificationPreferencesSection.tsx`).
 *   `PushActivationCard` itself now only ever invites activation
 *   (`mode="invite"`) — insertion point 3 (the control-mode mount inside the
 *   challenge's 'hoje' tab) is gone. `PushActivationCard.tsx` was not
 *   modified by that plan: it still accepts both modes and still returns
 *   `null` on `denied`/`unsupported` (D-06) — a regression here (either mode
 *   disappearing from the type, or a `mode="control"` mount reappearing
 *   anywhere) is exactly what the last `describe` below catches.
 *
 *   Quick 260802-fgr: insertion point 2 (challenge activation) stopped being
 *   an inline `PushActivationCard mode="invite"` mount and became
 *   `PushInviteModal`, an entry modal with a permanent per-device dismiss
 *   (`localStorage`) that SUPERSEDES D-05 at THIS insertion point only —
 *   `PushActivationCard`'s own docblock stays correct about the one
 *   insertion point it still owns (`pay.tsx`), where the dismiss remains
 *   local/volatile per D-05, exactly as before. `PushActivationCard` now has
 *   exactly ONE consumer (`pay.tsx`) with exactly one mode (`invite`).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, '..', 'src');

describe('src/routes/challenges/$challengeId.tsx — PushInviteModal mount contract (260802-fgr)', () => {
  const source = readFileSync(join(SRC_DIR, 'routes', 'challenges', '$challengeId.tsx'), 'utf-8');

  it('no longer mounts PushActivationCard in any tag form', () => {
    const matches = source.match(/<PushActivationCard/g) ?? [];
    expect(matches.length).toBe(0);
  });

  it('mounts PushInviteModal exactly once', () => {
    const matches = source.match(/<PushInviteModal/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('still has no control-mode mount', () => {
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

describe('src/components/PushInviteModal.tsx — consumes the pure lib and usePushSubscription (260802-fgr)', () => {
  const source = readFileSync(join(SRC_DIR, 'components', 'PushInviteModal.tsx'), 'utf-8');

  it('consumes derivePushInviteModalState', () => {
    expect(source).toContain('derivePushInviteModalState');
  });

  it('consumes usePushSubscription', () => {
    expect(source).toContain('usePushSubscription');
  });

  it('declares an accessible dialog (role="dialog" + aria-modal)', () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
  });
});
