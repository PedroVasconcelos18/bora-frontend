// @vitest-environment jsdom
/**
 * push-invite-modal.dom.test.tsx — real render coverage for
 * `components/PushInviteModal.tsx` (quick 260802-fgr).
 *
 * Mocks `usePushSubscription` so each test drives a single named
 * `PushCardState` directly, same pattern as
 * `notification-preferences-section.dom.test.tsx`.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PushInviteModal } from '../src/components/PushInviteModal';
import { PUSH_INVITE_DISMISSED_STORAGE_KEY, PUSH_INVITE_MODAL_COPY } from '../src/lib/push-invite-modal';
import type { PushCardState } from '../src/lib/push';

const usePushSubscriptionMock = vi.fn();

vi.mock('../src/hooks/usePushSubscription', () => ({
  usePushSubscription: () => usePushSubscriptionMock(),
}));

function mockSubscription(state: PushCardState, overrides: Partial<ReturnType<typeof baseSubscription>> = {}) {
  usePushSubscriptionMock.mockReturnValue({ ...baseSubscription(state), ...overrides });
}
function baseSubscription(state: PushCardState) {
  return { state, isMutating: false, subscribe: vi.fn() };
}

describe('PushInviteModal — behavioral (DOM)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('off + clean storage -> the dialog is in the document, role="dialog" aria-modal="true"', () => {
    mockSubscription('off');

    render(<PushInviteModal />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(PUSH_INVITE_MODAL_COPY.invite.heading)).toBeInTheDocument();
  });

  it.each<PushCardState>(['denied', 'unsupported', 'on', 'reconciling'])(
    '%s -> nothing in the document',
    (state) => {
      mockSubscription(state);

      render(<PushInviteModal />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('ios-not-installed -> dialog with install copy and WITHOUT the "Ativar" button', () => {
    mockSubscription('ios-not-installed');

    render(<PushInviteModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(PUSH_INVITE_MODAL_COPY.needsInstall.heading)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: PUSH_INVITE_MODAL_COPY.invite.activate })).not.toBeInTheDocument();
  });

  it('clicking "Ativar" calls subscribe() once and writes nothing to localStorage', async () => {
    const subscribe = vi.fn();
    mockSubscription('off', { subscribe });

    render(<PushInviteModal />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: PUSH_INVITE_MODAL_COPY.invite.activate }));

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(PUSH_INVITE_DISMISSED_STORAGE_KEY)).toBeNull();
  });

  it('clicking "Agora não" closes; a new mount (next screen entry) shows it again', async () => {
    mockSubscription('off');
    const { unmount } = render(<PushInviteModal />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: PUSH_INVITE_MODAL_COPY.dismissNow }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // "next screen entry" = cleanup() + render() again, the exact simulation
    // of leaving and returning to the route.
    unmount();
    cleanup();
    render(<PushInviteModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Escape closes the dialog', async () => {
    mockSubscription('off');
    render(<PushInviteModal />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicking the backdrop closes the dialog', () => {
    mockSubscription('off');
    render(<PushInviteModal />);

    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    // Fire directly on the backdrop element so target === currentTarget is
    // genuinely exercised (not a bubbled click from inside the dialog).
    fireEvent.click(backdrop, { target: backdrop });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicking the X closes the dialog', async () => {
    mockSubscription('off');
    render(<PushInviteModal />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: PUSH_INVITE_MODAL_COPY.close }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicking "Não me lembrar de novo" closes, writes localStorage, and a NEW mount shows nothing', async () => {
    mockSubscription('off');
    const { unmount } = render(<PushInviteModal />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: PUSH_INVITE_MODAL_COPY.dismissForever }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(PUSH_INVITE_DISMISSED_STORAGE_KEY)).toBe('1');

    unmount();
    cleanup();
    render(<PushInviteModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('accessibility: opening moves focus inside the dialog; Escape returns focus to the prior element', () => {
    mockSubscription('off');

    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    render(<PushInviteModal />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('accessibility: Tab on the last focusable wraps to the first (focus trap)', async () => {
    mockSubscription('off');
    render(<PushInviteModal />);

    const dialog = screen.getByRole('dialog');
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(focusables.length).toBeGreaterThan(1);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
