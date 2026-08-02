/**
 * push-preferences.test.ts — DOM-free vitest for `lib/push-preferences.ts`.
 * A second describe block (source-text contract for
 * `hooks/usePushPreferences.ts`, mirroring `test/service-worker.test.ts`'s
 * readFileSync + import.meta.url pattern) is appended by Plan 12-06's Task 2,
 * once that hook file exists.
 */

import { describe, it, expect } from 'vitest';
import {
  PUSH_PREFERENCE_ROWS,
  derivePreferencesSectionState,
  shouldShowInactiveHelper,
  BLOCKED_COPY,
  type DerivePreferencesSectionStateInput,
} from '../src/lib/push-preferences';
import type { NotificationType } from '../src/lib/notifications';
import type { PushCardState } from '../src/lib/push';

// Mesma ordem de declaração de `NotificationType` em `lib/notifications.ts:20-29`.
const NOTIFICATION_TYPE_ORDER: NotificationType[] = [
  'INVITE_RECEIVED',
  'PAYMENT_CONFIRMED',
  'EVIDENCE_SUBMITTED',
  'EVIDENCE_VALIDATED',
  'EVIDENCE_REMINDER',
  'CHALLENGE_FINALIZED',
  'CHALLENGE_CANCELLED',
  'CHALLENGE_ACTIVATED',
  'EVIDENCE_REJECTED',
];

describe('PUSH_PREFERENCE_ROWS', () => {
  it('has exactly 9 items, no repeated type', () => {
    expect(PUSH_PREFERENCE_ROWS.length).toBe(9);
    const types = PUSH_PREFERENCE_ROWS.map((row) => row.type);
    expect(new Set(types).size).toBe(9);
  });

  it('declares types in the exact NotificationType declaration order', () => {
    const types = PUSH_PREFERENCE_ROWS.map((row) => row.type);
    expect(types).toEqual(NOTIFICATION_TYPE_ORDER);
  });

  it('has exactly one item with a caption, and it is EVIDENCE_SUBMITTED (D12-04)', () => {
    const withCaption = PUSH_PREFERENCE_ROWS.filter((row) => row.caption !== undefined);
    expect(withCaption.length).toBe(1);
    expect(withCaption[0].type).toBe('EVIDENCE_SUBMITTED');
  });

  it('has a non-empty label and description for every row', () => {
    for (const row of PUSH_PREFERENCE_ROWS) {
      expect(row.label.length).toBeGreaterThan(0);
      expect(row.description.length).toBeGreaterThan(0);
    }
  });
});

describe('derivePreferencesSectionState', () => {
  const pushStates: PushCardState[] = ['reconciling', 'off', 'ios-not-installed', 'denied', 'on', 'unsupported'];
  const expected: Record<PushCardState, PreferencesSectionStateForTest> = {
    reconciling: 'loading',
    off: 'interactive',
    'ios-not-installed': 'interactive',
    denied: 'blocked',
    on: 'interactive',
    unsupported: 'blocked',
  };
  type PreferencesSectionStateForTest = 'loading' | 'blocked' | 'interactive';

  it('produces the correct result for all 12 combinations (6 pushState x 2 isPreferencesLoading)', () => {
    for (const pushState of pushStates) {
      for (const isPreferencesLoading of [false, true]) {
        const input: DerivePreferencesSectionStateInput = { pushState, isPreferencesLoading };
        const result = derivePreferencesSectionState(input);
        const wanted = isPreferencesLoading ? 'loading' : expected[pushState];
        expect(result, `pushState=${pushState} isPreferencesLoading=${isPreferencesLoading}`).toBe(wanted);
      }
    }
  });

  it('loading has precedence over blocked (denied + loading query -> loading, not blocked)', () => {
    expect(derivePreferencesSectionState({ pushState: 'denied', isPreferencesLoading: true })).toBe('loading');
    expect(derivePreferencesSectionState({ pushState: 'unsupported', isPreferencesLoading: true })).toBe('loading');
  });

  it('reconciling loads even when the preferences query itself is already settled', () => {
    expect(derivePreferencesSectionState({ pushState: 'reconciling', isPreferencesLoading: false })).toBe('loading');
  });

  it('denied and unsupported both block', () => {
    expect(derivePreferencesSectionState({ pushState: 'denied', isPreferencesLoading: false })).toBe('blocked');
    expect(derivePreferencesSectionState({ pushState: 'unsupported', isPreferencesLoading: false })).toBe('blocked');
  });
});

describe('shouldShowInactiveHelper', () => {
  it('is true only for off and ios-not-installed', () => {
    expect(shouldShowInactiveHelper('off')).toBe(true);
    expect(shouldShowInactiveHelper('ios-not-installed')).toBe(true);
    expect(shouldShowInactiveHelper('reconciling')).toBe(false);
    expect(shouldShowInactiveHelper('denied')).toBe(false);
    expect(shouldShowInactiveHelper('on')).toBe(false);
    expect(shouldShowInactiveHelper('unsupported')).toBe(false);
  });
});

describe('BLOCKED_COPY', () => {
  it('deniedBody keeps the actionable reversal path (contains "Permissões")', () => {
    expect(BLOCKED_COPY.deniedBody).toContain('Permissões');
  });

  it('unsupportedBody explains there is nothing to activate', () => {
    expect(BLOCKED_COPY.unsupportedBody.length).toBeGreaterThan(0);
  });
});
