/**
 * push-preferences.test.ts — DOM-free vitest for `lib/push-preferences.ts`,
 * plus a source-text contract test for `hooks/usePushPreferences.ts`
 * (mirrors `test/service-worker.test.ts`'s readFileSync + import.meta.url
 * pattern, since this repo has no jsdom/testing-library to mount a hook with).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PUSH_PREFERENCE_ROWS,
  derivePreferencesSectionState,
  shouldShowInactiveHelper,
  BLOCKED_COPY,
  deriveDeviceRow,
  DEVICE_ROW_COPY,
  type DerivePreferencesSectionStateInput,
  type DeriveDeviceRowInput,
  type DeviceRowState,
} from '../src/lib/push-preferences';
import type { NotificationType } from '../src/lib/notifications';
import type { PushCardState } from '../src/lib/push';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, '..', 'src');

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

describe('deriveDeviceRow', () => {
  const pushStates: PushCardState[] = ['reconciling', 'denied', 'unsupported', 'ios-not-installed', 'on', 'off'];

  const expected: Record<
    PushCardState,
    { state: DeviceRowState; checked: boolean; disabledFixed: boolean | null; caption: string | null }
  > = {
    reconciling: { state: 'loading', checked: false, disabledFixed: true, caption: null },
    denied: { state: 'blocked', checked: false, disabledFixed: true, caption: null },
    unsupported: { state: 'blocked', checked: false, disabledFixed: true, caption: null },
    'ios-not-installed': {
      state: 'needs-install',
      checked: false,
      disabledFixed: true,
      caption: DEVICE_ROW_COPY.captionNeedsInstall,
    },
    on: { state: 'on', checked: true, disabledFixed: null, caption: null },
    off: { state: 'off', checked: false, disabledFixed: null, caption: DEVICE_ROW_COPY.captionOff },
  };

  it('produces the correct result for all 12 combinations (6 pushState x 2 isMutating)', () => {
    for (const pushState of pushStates) {
      for (const isMutating of [false, true]) {
        const input: DeriveDeviceRowInput = { pushState, isMutating };
        const result = deriveDeviceRow(input);
        const want = expected[pushState];

        expect(result.state, `pushState=${pushState} isMutating=${isMutating}`).toBe(want.state);
        expect(result.checked, `pushState=${pushState} isMutating=${isMutating}`).toBe(want.checked);
        expect(result.caption, `pushState=${pushState} isMutating=${isMutating}`).toBe(want.caption);

        const wantDisabled = want.disabledFixed ?? isMutating;
        expect(result.disabled, `pushState=${pushState} isMutating=${isMutating}`).toBe(wantDisabled);
      }
    }
  });

  it('checked is true only for on', () => {
    for (const pushState of pushStates) {
      const result = deriveDeviceRow({ pushState, isMutating: false });
      expect(result.checked, pushState).toBe(pushState === 'on');
    }
  });

  it('caption is non-null only for off and ios-not-installed', () => {
    for (const pushState of pushStates) {
      const result = deriveDeviceRow({ pushState, isMutating: false });
      const shouldHaveCaption = pushState === 'off' || pushState === 'ios-not-installed';
      expect(result.caption !== null, pushState).toBe(shouldHaveCaption);
    }
  });

  it('isMutating never re-enables a fixed-disabled state (blocked/needs-install/loading)', () => {
    for (const pushState of ['reconciling', 'denied', 'unsupported', 'ios-not-installed'] as PushCardState[]) {
      expect(deriveDeviceRow({ pushState, isMutating: false }).disabled, pushState).toBe(true);
      expect(deriveDeviceRow({ pushState, isMutating: true }).disabled, pushState).toBe(true);
    }
  });
});

describe('DEVICE_ROW_COPY', () => {
  it('every string value is non-empty', () => {
    for (const [key, value] of Object.entries(DEVICE_ROW_COPY)) {
      expect(value.length, key).toBeGreaterThan(0);
    }
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

describe('hooks/usePushPreferences.ts — source contract (no DOM/testing-library available)', () => {
  const hookSource = readFileSync(join(SRC_DIR, 'hooks', 'usePushPreferences.ts'), 'utf-8');

  it('references the push-preferences query key', () => {
    expect(hookSource).toContain("['push-preferences']");
  });

  it('calls both GET and POST /push/preferences', () => {
    const matches = hookSource.match(/'\/push\/preferences'/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('gates the query on the logged-in user', () => {
    expect(hookSource).toContain('enabled: !!user');
  });

  it('drives mutation UI state from onMutate/onError/onSettled, not the mutation result snapshot', () => {
    expect(hookSource).toContain('onMutate');
    expect(hookSource).toContain('onError');
    expect(hookSource).toContain('onSettled');
    expect(hookSource).not.toMatch(/mutation\.isPending/);
  });

  it('restores the previous cache value on error via setQueryData', () => {
    const onErrorBlock = hookSource.slice(hookSource.indexOf('onError:'));
    expect(onErrorBlock).toContain('setQueryData');
  });
});
