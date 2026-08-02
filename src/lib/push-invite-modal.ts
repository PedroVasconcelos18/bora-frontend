import type { PushCardState } from './push';

/**
 * push-invite-modal.ts — pure derivation + device-scoped persistence for
 * `components/PushInviteModal.tsx` (quick 260802-fgr).
 *
 * Same spirit as `push-preferences.ts`: nothing here touches `window`,
 * `navigator`, or any browser permission API directly — the push state
 * arrives pre-derived via `usePushSubscription().state` (D12-09). This file
 * only decides, from that state plus two purely local booleans, which of the
 * 3 visual states the modal shows.
 *
 * D-05 SUPERSEDED AT THIS INSERTION POINT: `PushActivationCard`'s docblock
 * (lines 28-31) documents that its "dismissed" flag is local, unpersisted
 * component state, because declining costs nothing — that remains true FOR
 * THE CARD, at the one insertion point it still owns (`pay.tsx`). This modal
 * replaces the OTHER insertion point (challenge activation), and there the
 * product decision is different: "Não me lembrar de novo"
 * (`rememberInviteDismissedForever`) is a PERMANENT, per-device opt-out,
 * because a convite that reappears on every entry into every challenge costs
 * real attention. The grain is per-device (not per-account) because push
 * subscription itself is per-device (D-08) — there is no server-side
 * concept of "this person dismissed the invite" to hang it off of.
 */

/** Same naming scheme as `PUSH_ENDPOINT_STORAGE_KEY` (`push.ts:22`). */
export const PUSH_INVITE_DISMISSED_STORAGE_KEY = 'bora:push:invite-dismissed';

/**
 * readInviteDismissedForever — reads the permanent-dismiss flag. Tolerates a
 * `localStorage` that throws (private mode) or a `window`-less environment
 * (this file's own vitest suite runs with no jsdom) the same way
 * `readRememberedEndpoint` (`push.ts:25-31`) does: any exception -> `false`.
 */
export function readInviteDismissedForever(): boolean {
  try {
    return window.localStorage.getItem(PUSH_INVITE_DISMISSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * rememberInviteDismissedForever — writes the permanent-dismiss flag.
 * Tolerates a `localStorage` that throws (private mode) with a silent no-op
 * catch, mirroring `rememberEndpoint`'s best-effort format (`push.ts:33-40`)
 * — no toast, no thrown error, nothing for the caller to handle.
 *
 * Deliberately no "forget" counterpart: rule 1 is definitive for this
 * device. Anyone who changes their mind re-enables push from their profile
 * (quick 260801-v15's device row in `NotificationPreferencesSection`) —
 * that's exactly what it exists for, so this modal does not need a second
 * way back in.
 */
export function rememberInviteDismissedForever(): void {
  try {
    window.localStorage.setItem(PUSH_INVITE_DISMISSED_STORAGE_KEY, '1');
  } catch {
    // Private mode / storage disabled — best-effort, nothing to do here.
  }
}

export type PushInviteModalState = 'hidden' | 'invite' | 'needs-install';

export interface DerivePushInviteModalStateInput {
  pushState: PushCardState;
  dismissedForever: boolean;
  closedThisVisit: boolean;
}

/**
 * derivePushInviteModalState — PURE, no `window`/`navigator` access inside.
 * Evaluated strictly in this order, because the order IS the product
 * decision:
 *
 * 1. `dismissedForever` -> 'hidden' (rule 1, permanent per device, wins over
 *    everything else — even a later `pushState` change);
 * 2. `closedThisVisit` -> 'hidden' (rule 2, only until the next mount of the
 *    challenge screen — no session throttling beyond that, by design);
 * 3. `pushState === 'reconciling'` -> 'hidden' (loading takes precedence
 *    over any decision, same rule `derivePreferencesSectionState` already
 *    applies in `push-preferences.ts:110`);
 * 4. `pushState === 'denied' || 'unsupported'` -> 'hidden' (D-06 — the two
 *    are treated identically, the same equivalence `PushActivationCard.tsx:41`
 *    and `deriveDeviceRow` already use);
 * 5. `pushState === 'on'` -> 'hidden' (rule 3 — activation resolves the
 *    invite by itself, nothing is persisted for this branch);
 * 6. `pushState === 'ios-not-installed'` -> 'needs-install';
 * 7. everything else (`off`) -> 'invite'.
 */
export function derivePushInviteModalState(input: DerivePushInviteModalStateInput): PushInviteModalState {
  if (input.dismissedForever) return 'hidden';
  if (input.closedThisVisit) return 'hidden';
  if (input.pushState === 'reconciling') return 'hidden';
  if (input.pushState === 'denied' || input.pushState === 'unsupported') return 'hidden';
  if (input.pushState === 'on') return 'hidden';
  if (input.pushState === 'ios-not-installed') return 'needs-install';
  return 'invite';
}

/** Literal copy for `PushInviteModal.tsx`, same shape as `DEVICE_ROW_COPY`. */
export const PUSH_INVITE_MODAL_COPY = {
  invite: {
    // Identical literal to the card's `off` heading (`PushActivationCard.tsx:108`)
    // — one voice for the same invite, whichever surface shows it.
    heading: 'Quer que eu te lembre às 18h?',
    body: 'Um toque por dia, no fim da tarde, pra você não deixar a evidência do dia pra depois.',
    activate: 'Ativar',
  },
  needsInstall: {
    // Literal from the card's `ios-not-installed` branch (`PushActivationCard.tsx:80-81`).
    heading: 'Pra eu te lembrar às 18h, adiciona o Bora na tela de início',
    body: 'Toque em Compartilhar e depois em Adicionar à Tela de Início.',
  },
  dismissNow: 'Agora não',
  dismissForever: 'Não me lembrar de novo',
  close: 'Fechar',
} as const;
