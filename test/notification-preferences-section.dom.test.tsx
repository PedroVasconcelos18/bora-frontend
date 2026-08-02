// @vitest-environment jsdom
/**
 * notification-preferences-section.dom.test.tsx — real render coverage for
 * `components/NotificationPreferencesSection.tsx` (Nyquist gap fill, phase 12).
 *
 * Mocks the two data hooks (`usePushSubscription`, `usePushPreferences`) so each
 * test drives a single named `PushCardState`/preferences shape directly, per
 * `12-UI-SPEC.md` §Preferences Section — State Contract, rather than re-deriving
 * hook internals here.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPreferencesSection } from '../src/components/NotificationPreferencesSection';
import { PUSH_PREFERENCE_ROWS, BLOCKED_COPY } from '../src/lib/push-preferences';
import type { PushCardState } from '../src/lib/push';

const usePushSubscriptionMock = vi.fn();
const usePushPreferencesMock = vi.fn();

vi.mock('../src/hooks/usePushSubscription', () => ({
  usePushSubscription: () => usePushSubscriptionMock(),
}));
vi.mock('../src/hooks/usePushPreferences', () => ({
  usePushPreferences: () => usePushPreferencesMock(),
}));

const ALL_ENABLED = PUSH_PREFERENCE_ROWS.map((row) => ({ type: row.type, enabled: true }));

function mockSubscription(state: PushCardState, overrides: Partial<ReturnType<typeof baseSubscription>> = {}) {
  usePushSubscriptionMock.mockReturnValue({ ...baseSubscription(state), ...overrides });
}
function baseSubscription(state: PushCardState) {
  return { state, isMutating: false, subscribe: vi.fn(), unsubscribe: vi.fn() };
}

function mockPreferences(overrides: Partial<ReturnType<typeof basePreferences>> = {}) {
  usePushPreferencesMock.mockReturnValue({ ...basePreferences(), ...overrides });
}
function basePreferences() {
  return {
    preferences: ALL_ENABLED,
    isLoading: false,
    pendingType: null,
    setPreference: vi.fn(),
  };
}

describe('NotificationPreferencesSection — behavioral (DOM)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the loading shimmer and no switches while preferences are loading', () => {
    mockSubscription('on');
    mockPreferences({ isLoading: true });

    render(<NotificationPreferencesSection />);

    expect(screen.getByText('Carregando preferências...')).toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
  });

  it('renders the blocked banner and disables all 9 type switches plus the device switch when permission is denied', async () => {
    mockSubscription('denied');
    mockPreferences();

    render(<NotificationPreferencesSection />);

    expect(screen.getByText(BLOCKED_COPY.deniedHeading)).toBeInTheDocument();
    expect(screen.getByText(BLOCKED_COPY.deniedBody)).toBeInTheDocument();

    const switches = screen.getAllByRole('switch');
    // 9 type rows + 1 device row = 10 switches, ALL disabled.
    expect(switches).toHaveLength(10);
    for (const el of switches) {
      expect(el).toBeDisabled();
    }
  });

  it('shows the unsupported banner copy when the browser does not support push', () => {
    mockSubscription('unsupported');
    mockPreferences();

    render(<NotificationPreferencesSection />);

    expect(screen.getByText(BLOCKED_COPY.unsupportedHeading)).toBeInTheDocument();
    expect(screen.getByText(BLOCKED_COPY.unsupportedBody)).toBeInTheDocument();
  });

  it('renders exactly 9 type rows in PUSH_PREFERENCE_ROWS order, plus the device row, when interactive', () => {
    mockSubscription('on');
    mockPreferences();

    render(<NotificationPreferencesSection />);

    // No blocked banner in the interactive state.
    expect(screen.queryByText(BLOCKED_COPY.deniedHeading)).not.toBeInTheDocument();
    expect(screen.queryByText(BLOCKED_COPY.unsupportedHeading)).not.toBeInTheDocument();

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(10);

    // Device row label appears first (device block is rendered before the 9-row list).
    expect(switches[0]).toHaveAccessibleName('Notificações neste aparelho');

    // The remaining 9 switches follow PUSH_PREFERENCE_ROWS declaration order exactly.
    const typeSwitches = switches.slice(1);
    expect(typeSwitches).toHaveLength(9);
    typeSwitches.forEach((el, i) => {
      expect(el).toHaveAccessibleName(PUSH_PREFERENCE_ROWS[i].label);
    });

    for (const el of switches) {
      expect(el).not.toBeDisabled();
    }
  });

  it('shows the off-by-default caption on the EVIDENCE_SUBMITTED row', () => {
    mockSubscription('on');
    mockPreferences();

    render(<NotificationPreferencesSection />);

    const row = PUSH_PREFERENCE_ROWS.find((r) => r.type === 'EVIDENCE_SUBMITTED');
    expect(row?.caption).toBeTruthy();
    expect(screen.getByText(row!.caption!)).toBeInTheDocument();

    // No other row has a caption in the DOM.
    const otherCaptions = PUSH_PREFERENCE_ROWS.filter((r) => r.type !== 'EVIDENCE_SUBMITTED' && r.caption);
    expect(otherCaptions).toHaveLength(0);
  });

  it('toggling the device row calls subscribe/unsubscribe from usePushSubscription, not setPreference', async () => {
    const subscribe = vi.fn();
    const unsubscribe = vi.fn();
    mockSubscription('off', { subscribe, unsubscribe });
    const setPreference = vi.fn();
    mockPreferences({ setPreference });

    render(<NotificationPreferencesSection />);

    const deviceSwitch = screen.getByRole('switch', { name: 'Notificações neste aparelho' });
    const user = userEvent.setup();
    await user.click(deviceSwitch);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(setPreference).not.toHaveBeenCalled();
  });

  it('toggling a type row calls setPreference with that type, not subscribe/unsubscribe', async () => {
    const subscribe = vi.fn();
    const unsubscribe = vi.fn();
    mockSubscription('on', { subscribe, unsubscribe });
    const setPreference = vi.fn();
    mockPreferences({ setPreference });

    render(<NotificationPreferencesSection />);

    const inviteRow = PUSH_PREFERENCE_ROWS.find((r) => r.type === 'INVITE_RECEIVED')!;
    const rowSwitch = screen.getByRole('switch', { name: inviteRow.label });
    const user = userEvent.setup();
    await user.click(rowSwitch);

    expect(setPreference).toHaveBeenCalledWith('INVITE_RECEIVED', false);
    expect(subscribe).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
