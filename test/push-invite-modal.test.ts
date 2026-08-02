/**
 * push-invite-modal.test.ts — DOM-free vitest for `lib/push-invite-modal.ts`
 * (quick 260802-fgr), mirroring the convention of `push-preferences.test.ts`:
 * no jsdom, no `window` — this is the pure-derivation half. The real
 * `localStorage` round-trip and the rendered dialog are covered by
 * `push-invite-modal.dom.test.tsx` (jsdom) instead.
 */

import { describe, it, expect } from 'vitest';
import {
  derivePushInviteModalState,
  readInviteDismissedForever,
  rememberInviteDismissedForever,
  PUSH_INVITE_MODAL_COPY,
  type PushInviteModalState,
} from '../src/lib/push-invite-modal';
import type { PushCardState } from '../src/lib/push';

// The 24 combinations from the plan's <behavior> block, hard-coded literally
// (not re-derived through a mirror of the implementation) so a bug that
// creeps into both the table and the function at once cannot hide.
const CASES: Array<[PushCardState, boolean, boolean, PushInviteModalState]> = [
  ['off', false, false, 'invite'],
  ['off', false, true, 'hidden'],
  ['off', true, false, 'hidden'],
  ['off', true, true, 'hidden'],

  ['ios-not-installed', false, false, 'needs-install'],
  ['ios-not-installed', false, true, 'hidden'],
  ['ios-not-installed', true, false, 'hidden'],
  ['ios-not-installed', true, true, 'hidden'],

  ['reconciling', false, false, 'hidden'],
  ['reconciling', false, true, 'hidden'],
  ['reconciling', true, false, 'hidden'],
  ['reconciling', true, true, 'hidden'],

  ['denied', false, false, 'hidden'],
  ['denied', false, true, 'hidden'],
  ['denied', true, false, 'hidden'],
  ['denied', true, true, 'hidden'],

  ['unsupported', false, false, 'hidden'],
  ['unsupported', false, true, 'hidden'],
  ['unsupported', true, false, 'hidden'],
  ['unsupported', true, true, 'hidden'],

  ['on', false, false, 'hidden'],
  ['on', false, true, 'hidden'],
  ['on', true, false, 'hidden'],
  ['on', true, true, 'hidden'],
];

describe('derivePushInviteModalState — 24 combinations (6 pushStates x 2 x 2)', () => {
  it.each(CASES)(
    'pushState=%s dismissedForever=%s closedThisVisit=%s -> %s',
    (pushState, dismissedForever, closedThisVisit, expected) => {
      expect(derivePushInviteModalState({ pushState, dismissedForever, closedThisVisit })).toBe(expected);
    },
  );

  it('exactly 24 combinations are covered', () => {
    expect(CASES.length).toBe(24);
  });

  it('"invite" and "needs-install" each appear in exactly one combination', () => {
    const results = CASES.map(([pushState, dismissedForever, closedThisVisit]) =>
      derivePushInviteModalState({ pushState, dismissedForever, closedThisVisit }),
    );
    expect(results.filter((r) => r === 'invite')).toHaveLength(1);
    expect(results.filter((r) => r === 'needs-install')).toHaveLength(1);
  });
});

describe('PUSH_INVITE_MODAL_COPY', () => {
  it('every string entry is non-empty', () => {
    const values = [
      PUSH_INVITE_MODAL_COPY.invite.heading,
      PUSH_INVITE_MODAL_COPY.invite.body,
      PUSH_INVITE_MODAL_COPY.invite.activate,
      PUSH_INVITE_MODAL_COPY.needsInstall.heading,
      PUSH_INVITE_MODAL_COPY.needsInstall.body,
      PUSH_INVITE_MODAL_COPY.dismissNow,
      PUSH_INVITE_MODAL_COPY.dismissForever,
      PUSH_INVITE_MODAL_COPY.close,
    ];
    for (const value of values) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('storage tolerance — no `window` in this environment', () => {
  it('readInviteDismissedForever() returns false and does not throw', () => {
    expect(() => readInviteDismissedForever()).not.toThrow();
    expect(readInviteDismissedForever()).toBe(false);
  });

  it('rememberInviteDismissedForever() does not throw', () => {
    expect(() => rememberInviteDismissedForever()).not.toThrow();
  });
});
