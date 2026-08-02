import { useEffect, useRef, useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { usePushSubscription } from '../hooks/usePushSubscription';
import {
  derivePushInviteModalState,
  readInviteDismissedForever,
  rememberInviteDismissedForever,
  PUSH_INVITE_MODAL_COPY,
} from '../lib/push-invite-modal';

const HEADING_ID = 'push-invite-modal-heading';
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * PushInviteModal — the challenge-entry push invite (successor of the inline
 * `PushActivationCard mode="invite"` mount at insertion point 2, quick
 * 260802-fgr). Zero props: mounting IS the trigger, one per screen entry.
 *
 * The 3 display rules — permanent per-device dismiss, per-visit close, and
 * "activation resolves itself, nothing persisted" — all live in
 * `derivePushInviteModalState` (`lib/push-invite-modal.ts`), not here; this
 * component never repeats any of them in a local `if`. D-06 (denied/
 * unsupported render nothing) is honored the same way: by derivation, not by
 * a local branch.
 *
 * This insertion point SUPERSEDES D-05: `PushActivationCard`'s dismiss stays
 * local/unpersisted where the card still lives (`pay.tsx`), but here "Não me
 * lembrar de novo" is a permanent per-device opt-out — see
 * `push-invite-modal.ts`'s docblock for why.
 */
export function PushInviteModal() {
  const { state, isMutating, subscribe } = usePushSubscription();
  const [closedThisVisit, setClosedThisVisit] = useState(false);
  const [dismissedForever, setDismissedForever] = useState(() => readInviteDismissedForever());
  const dialogRef = useRef<HTMLDivElement>(null);

  const modalState = derivePushInviteModalState({ pushState: state, dismissedForever, closedThisVisit });
  const isVisible = modalState !== 'hidden';

  const handleClose = () => setClosedThisVisit(true);

  const handleDismissForever = () => {
    rememberInviteDismissedForever();
    setDismissedForever(true);
  };

  const handleActivate = () => {
    // Deliberately no try/catch and no local close: `on` (success) and
    // `denied` (declined) both already resolve the derivation to 'hidden'
    // on their own. `usePushSubscription`'s mutation already has its own
    // `onError` (including the deliberate silence when the person just
    // declines the browser prompt) — duplicating that here would produce a
    // second toast for the same event.
    subscribe();
  };

  // Focus: the modal opens on its own at screen entry, so "the trigger" is
  // literally whatever element held focus at that moment — save it, move
  // focus inside the dialog, and restore it on close.
  useEffect(() => {
    if (!isVisible) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [isVisible]);

  // Escape, same pattern and same reason as PixOverlay.tsx:50-56 — the
  // listener lives OUTSIDE any state branch so it is never conditionally
  // (un)registered.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!isVisible) return null;

  const handleTrapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const container = dialogRef.current;
    if (!container) return;
    const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === container) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      onClick={(e) => {
        // Only close when the click landed on the backdrop itself, not on
        // something inside the dialog (target === currentTarget) — same
        // check as PixOverlay.tsx:60-64.
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11,59,34,.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 22,
        zIndex: 50,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={HEADING_ID}
        tabIndex={-1}
        onKeyDown={handleTrapTab}
        style={{
          width: 'min(420px, calc(100vw - 44px))',
          background: 'var(--card)',
          borderRadius: 26,
          padding: 26,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" aria-label={PUSH_INVITE_MODAL_COPY.close} onClick={handleClose} style={cheapTextStyle}>
            ×
          </button>
        </div>

        {modalState === 'invite' ? (
          <>
            <h2 id={HEADING_ID} style={headingStyle}>
              {PUSH_INVITE_MODAL_COPY.invite.heading}
            </h2>
            <p style={bodyTextStyle}>{PUSH_INVITE_MODAL_COPY.invite.body}</p>
            <div style={{ marginTop: 16 }}>
              <PrimaryButton onClick={handleActivate} loading={isMutating}>
                {PUSH_INVITE_MODAL_COPY.invite.activate}
              </PrimaryButton>
            </div>
          </>
        ) : (
          <>
            <h2 id={HEADING_ID} style={headingStyle}>
              {PUSH_INVITE_MODAL_COPY.needsInstall.heading}
            </h2>
            <p style={bodyTextStyle}>{PUSH_INVITE_MODAL_COPY.needsInstall.body}</p>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button type="button" style={cheapTextStyle} onClick={handleClose}>
            {PUSH_INVITE_MODAL_COPY.dismissNow}
          </button>
          <button type="button" style={cheapTextStyle} onClick={handleDismissForever}>
            {PUSH_INVITE_MODAL_COPY.dismissForever}
          </button>
        </div>
      </div>
    </div>
  );
}

// Recipes copied from PushActivationCard.tsx:130-151 (headingStyle,
// bodyTextStyle, cheapTextStyle) — no new geometry, same design system
// tokens as the card this modal replaces at this insertion point.
const headingStyle: React.CSSProperties = {
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '1rem',
  color: 'var(--ink)',
};

const bodyTextStyle: React.CSSProperties = {
  color: 'var(--muted)',
  marginTop: 8,
};

const cheapTextStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--muted)',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
};
