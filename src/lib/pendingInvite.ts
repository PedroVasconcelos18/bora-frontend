/**
 * pendingInvite.ts — single source of the pending-invite sessionStorage contract.
 *
 * WHY THIS EXISTS:
 *   The invite token must survive the auth redirect (invite -> signup/login ->
 *   back to the invite). Previously the sessionStorage key ('pendingInviteToken')
 *   was duplicated as a literal string in both __root.tsx and invites/$token.tsx,
 *   and neither signup.tsx nor login.tsx consumed it — leaving the invitee
 *   stranded on /home after auth (GAP 2). This module centralizes the key and
 *   the save/consume operations so there is exactly one writer contract.
 *
 * DOM-FREE BY DESIGN:
 *   The storage dependency is injected (defaulting to the browser sessionStorage
 *   when available) so this module — and its unit test — can run in vitest's
 *   default node environment with no jsdom dependency.
 */

export const PENDING_INVITE_KEY = 'pendingInviteToken';

type InviteStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

function defaultStorage(): InviteStorage | null {
  return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
}

/** Save a pending invite token before redirecting to the auth flow. */
export function savePendingInvite(token: string, storage: InviteStorage | null = defaultStorage()): void {
  storage?.setItem(PENDING_INVITE_KEY, token);
}

/**
 * Read and clear the pending invite token, if any.
 * Returns the token, or null if none was saved.
 */
export function consumePendingInvite(storage: InviteStorage | null = defaultStorage()): string | null {
  if (!storage) return null;
  const token = storage.getItem(PENDING_INVITE_KEY);
  if (token) {
    storage.removeItem(PENDING_INVITE_KEY);
  }
  return token;
}
