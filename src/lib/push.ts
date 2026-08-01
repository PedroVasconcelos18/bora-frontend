/**
 * push.ts — browser primitives + the pure state derivation for the push
 * activation card (Phase 11, Plan 07).
 *
 * D-05/D-06 (11-CONTEXT.md): the native permission prompt is a one-shot
 * browser resource — the permission-request call has exactly ONE call site
 * in this file (`subscribeBrowser`), asserted by grep in the plan's
 * acceptance criteria. No component may call it directly.
 *
 * Discretion #4: "ativo" is the INTERSECTION of a live browser subscription
 * and a matching server row — never one side alone. `derivePushCardState`
 * below is a pure function (no `window`/`navigator` access inside) so the
 * ordering of that decision is exhaustively unit-tested without a DOM.
 */

/**
 * D-08's device-scoped half: a person's other devices have their own rows
 * and must never be touched by this device's reconciliation. Remembering
 * the endpoint locally is the only way to know WHICH server row belonged
 * to this device once the browser subscription itself is gone.
 */
export const PUSH_ENDPOINT_STORAGE_KEY = 'bora:push:endpoint';

/** Reads the remembered endpoint. Tolerates a `localStorage` that throws (private mode). */
export function readRememberedEndpoint(): string | null {
  try {
    return window.localStorage.getItem(PUSH_ENDPOINT_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Remembers `endpoint` locally. Tolerates a `localStorage` that throws (private mode). */
export function rememberEndpoint(endpoint: string): void {
  try {
    window.localStorage.setItem(PUSH_ENDPOINT_STORAGE_KEY, endpoint);
  } catch {
    // Private mode / storage disabled — nothing to do, this is best-effort.
  }
}

/** Forgets the remembered endpoint. Tolerates a `localStorage` that throws (private mode). */
export function forgetEndpoint(): void {
  try {
    window.localStorage.removeItem(PUSH_ENDPOINT_STORAGE_KEY);
  } catch {
    // Private mode / storage disabled — nothing to do, this is best-effort.
  }
}

/**
 * urlBase64ToUint8Array — the well-known Web Push conversion (11-RESEARCH.md
 * §Code Examples, §Don't Hand-Roll): pad to a multiple of four with `=`,
 * swap the url-safe alphabet back to standard base64, decode, map char
 * codes into a Uint8Array. Copied rather than improvised — the padding
 * arithmetic is exactly the kind of thing that is easy to get subtly wrong.
 *
 * Uses the global `atob` (not `window.atob`) so this stays callable from a
 * DOM-free vitest run (this repo has no jsdom environment) as well as from
 * a real browser, where `atob` is equally available as a global.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Whether the Push API is available at all (service worker + PushManager + Notification). */
export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Whether this is an iOS device (Discretion #2). Covers the iPhone/iPad/iPod
 * user-agent family, plus the iPadOS 13+ lie: it reports as `MacIntel` but
 * has multi-touch, which no real Mac has.
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
}

/**
 * Whether the document is running in standalone display — either the
 * standards-track `display-mode: standalone` media query, or the legacy
 * `navigator.standalone` flag Safari sets on an installed iOS PWA.
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * PushCardState — 11-UI-SPEC.md's 5 states (`reconciling`, `off`,
 * `ios-not-installed`, `denied`, `on`) plus `unsupported`, added
 * deliberately: a browser with no Push API at all must not be shown a
 * button that cannot work. Renders nothing, same as `denied`.
 */
export type PushCardState = 'reconciling' | 'off' | 'ios-not-installed' | 'denied' | 'on' | 'unsupported';

export interface DerivePushCardStateInput {
  /** True while the browser subscription check and/or the server status check are still in flight. */
  isChecking: boolean;
  /** The current `Notification.permission` value ('default' | 'granted' | 'denied'). */
  permission: NotificationPermission | 'default';
  /** Whether `pushManager.getSubscription()` currently returns a subscription on this device. */
  browserSubscribed: boolean;
  /** Whether the server's endpoint list includes this device's subscription. */
  serverHasEndpoint: boolean;
  /** Whether the server-side reminder preference is enabled (D-08). */
  serverEnabled: boolean;
  /** Whether the Push API is supported at all. */
  isSupported: boolean;
  /** Whether this is an iOS device (Discretion #2). */
  isIOS: boolean;
  /** Whether the document is running in standalone display. */
  isStandalone: boolean;
}

/**
 * derivePushCardState — PURE function, no `window`/`navigator` access
 * inside. Evaluated strictly in this order because the order IS the
 * product decision (11-UI-SPEC.md's State Contract):
 *
 * 1. still checking -> `reconciling` (never flash a guessed state)
 * 2. permission denied -> `denied` (D-06 — insisting is pointless)
 * 3. browser subscribed AND server has the endpoint AND server enabled -> `on`
 *    (the intersection — neither side alone is ever sufficient, Discretion #4)
 * 4. push unsupported -> `unsupported`, unless iOS outside standalone, which falls through
 * 5. iOS outside standalone -> `ios-not-installed` (Discretion #2)
 * 6. otherwise -> `off`
 */
export function derivePushCardState(input: DerivePushCardStateInput): PushCardState {
  if (input.isChecking) return 'reconciling';
  if (input.permission === 'denied') return 'denied';
  if (input.browserSubscribed && input.serverHasEndpoint && input.serverEnabled) return 'on';

  if (!input.isSupported && !(input.isIOS && !input.isStandalone)) return 'unsupported';
  if (input.isIOS && !input.isStandalone) return 'ios-not-installed';

  return 'off';
}

/**
 * getBrowserEndpoint — reads the EXISTING registration's current
 * subscription without ever creating one. Uses `getRegistration()` (not
 * `.ready`, which awaits a registration that may never resolve) since this
 * is a passive read, not a subscribe attempt.
 */
export async function getBrowserEndpoint(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  const subscription = await registration.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

/**
 * subscribeBrowser — the ONLY call site of the native permission-request
 * API in the whole frontend (D-05). In order:
 * 1. fail loud when `VITE_VAPID_PUBLIC_KEY` is empty — a missing build-time
 *    var on Vercel is exactly the silent failure this phase avoids;
 * 2. request permission, throw a distinguishable error when not granted;
 * 3. await the service worker registration (Plan 11-06 registers it at boot);
 * 4. subscribe with the visibility flag Chrome requires for a valid call;
 * 5. return ONLY `endpoint` + the two key strings — never the raw
 *    subscription JSON, whose extra `expirationTime` field would trip the
 *    backend's `forbidNonWhitelisted` validation pipe.
 */
export async function subscribeBrowser(): Promise<{
  endpoint: string;
  keys: { p256dh: string; auth: string };
}> {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error('VITE_VAPID_PUBLIC_KEY ausente — build sem a chave VAPID pública');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('push-permission-not-granted');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // Cast needed: TS's DOM lib types `applicationServerKey` against a
    // `Uint8Array<ArrayBuffer>`-shaped BufferSource, but the conversion
    // helper's return type is the wider `Uint8Array<ArrayBufferLike>` —
    // the runtime value is always a plain ArrayBuffer-backed Uint8Array.
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });

  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
  if (!json.endpoint || !json.keys) {
    throw new Error('push-subscription-malformed');
  }

  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

/**
 * unsubscribeBrowser — reads the current subscription, unsubscribes it, and
 * returns the endpoint that was removed so the caller can tell the server
 * which row to delete.
 */
export async function unsubscribeBrowser(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
