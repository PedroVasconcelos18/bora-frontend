import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import { showToast } from '../components/Toast';
import {
  derivePushCardState,
  forgetEndpoint,
  getBrowserSubscriptionDetails,
  isIOSDevice,
  isPushSupported,
  isStandaloneDisplay,
  readRememberedEndpoint,
  rememberEndpoint,
  subscribeBrowser,
  unsubscribeBrowser,
  type PushCardState,
} from '../lib/push';

interface PushStatusResponse {
  enabled: boolean;
  endpoints: string[];
}

interface PushQueryResult {
  permission: NotificationPermission | 'default';
  browserSubscribed: boolean;
  serverHasEndpoint: boolean;
  serverEnabled: boolean;
  isSupported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
}

function readPermission(): NotificationPermission | 'default' {
  return typeof Notification !== 'undefined' ? Notification.permission : 'default';
}

/**
 * fetchPushState — the query function. Performs the Discretion #4
 * reconciliation (11-CONTEXT.md), then returns the reconciled facts
 * `derivePushCardState` needs.
 *
 * Both self-heal directions are scoped to THIS device only (D-08 — a
 * person's other devices have their own rows and must never be touched):
 * - browser has an endpoint the server does not list -> re-register it
 *   silently, since the row was pruned or lost and the device is
 *   genuinely subscribed;
 * - browser has no endpoint, but the endpoint remembered from a previous
 *   session on THIS device is still listed by the server -> unsubscribe
 *   that exact endpoint and forget it locally;
 * - browser has no endpoint and nothing is remembered -> do nothing.
 */
async function fetchPushState(): Promise<PushQueryResult> {
  const isSupported = isPushSupported();
  const isIOS = isIOSDevice();
  const isStandalone = isStandaloneDisplay();

  if (!isSupported) {
    return {
      permission: 'default',
      browserSubscribed: false,
      serverHasEndpoint: false,
      serverEnabled: false,
      isSupported,
      isIOS,
      isStandalone,
    };
  }

  const permission = readPermission();

  const [details, statusRes] = await Promise.all([getBrowserSubscriptionDetails(), apiClient.get('/push/status')]);
  if (!statusRes.ok) throw new Error('push-status-error');
  let status = (await statusRes.json()) as PushStatusResponse;

  if (details && !status.endpoints.includes(details.endpoint)) {
    // Browser is genuinely subscribed but the server lost/pruned the row.
    const res = await apiClient.post('/push/subscriptions', { endpoint: details.endpoint, keys: details.keys });
    if (res.ok) {
      rememberEndpoint(details.endpoint);
      status = (await res.json()) as PushStatusResponse;
    }
  } else if (!details) {
    const remembered = readRememberedEndpoint();
    if (remembered && status.endpoints.includes(remembered)) {
      // This device unsubscribed outside the app (icon removed, permission
      // reset). Delete only the remembered row — never another device's.
      const res = await apiClient.post('/push/subscriptions/unsubscribe', { endpoint: remembered });
      forgetEndpoint();
      if (res.ok) {
        status = (await res.json()) as PushStatusResponse;
      }
    }
  }

  const browserEndpoint = details?.endpoint ?? null;
  return {
    permission,
    browserSubscribed: !!browserEndpoint,
    serverHasEndpoint: browserEndpoint ? status.endpoints.includes(browserEndpoint) : false,
    serverEnabled: status.enabled,
    isSupported,
    isIOS,
    isStandalone,
  };
}

/**
 * usePushSubscription — shaped after `useUnreadCount`: one shared query key,
 * `enabled` gated on the logged-in user INSIDE the hook so it never fires
 * on public routes.
 *
 * `isMutating` is driven by state set inside the `useMutation` OPTION
 * callbacks (`onMutate`/`onSettled`), never by a mutation's own returned
 * pending snapshot — under StrictMode this project has already been
 * bitten: the result subscription detaches in flight and the snapshot
 * freezes in that state forever (see STATE.md's Accumulated Context and
 * `PixPaymentCore.tsx`'s `usePixPayment` docblock, the established fix for
 * the exact same class of bug). The query's own pending flag below is a
 * different, unrelated read — it is what feeds `derivePushCardState`'s
 * "still checking" input, not `isMutating`.
 */
export function usePushSubscription() {
  const { user } = useAuthStore();
  const [isMutating, setIsMutating] = useState(false);

  const query = useQuery<PushQueryResult>({
    queryKey: ['push-subscription-state'],
    queryFn: fetchPushState,
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const { endpoint, keys } = await subscribeBrowser();
      const res = await apiClient.post('/push/subscriptions', { endpoint, keys });
      if (!res.ok) throw new Error('push-subscribe-error');
      rememberEndpoint(endpoint);
    },
    onMutate: () => {
      setIsMutating(true);
    },
    onSettled: () => {
      setIsMutating(false);
      void query.refetch();
    },
    onError: (err: Error) => {
      if (err.message === 'push-permission-not-granted') {
        // The person simply declined (D-06) — no failure toast. The next
        // read (triggered by onSettled's refetch above) moves the card to
        // `denied` once the browser's own permission state reflects it.
        return;
      }
      showToast('Não deu pra ativar o lembrete agora. Tenta de novo em instantes.');
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeBrowser();
      if (endpoint) {
        await apiClient.post('/push/subscriptions/unsubscribe', { endpoint });
        forgetEndpoint();
      }
    },
    onMutate: () => {
      setIsMutating(true);
    },
    onSettled: () => {
      setIsMutating(false);
      void query.refetch();
    },
    onError: () => {
      showToast('Não deu pra desativar o lembrete agora. Tenta de novo em instantes.');
    },
  });

  const state: PushCardState = derivePushCardState({
    isChecking: query.isPending,
    permission: query.data?.permission ?? 'default',
    browserSubscribed: query.data?.browserSubscribed ?? false,
    serverHasEndpoint: query.data?.serverHasEndpoint ?? false,
    serverEnabled: query.data?.serverEnabled ?? false,
    isSupported: query.data?.isSupported ?? isPushSupported(),
    isIOS: query.data?.isIOS ?? isIOSDevice(),
    isStandalone: query.data?.isStandalone ?? isStandaloneDisplay(),
  });

  return {
    state,
    isMutating,
    subscribe: () => subscribeMutation.mutate(),
    unsubscribe: () => unsubscribeMutation.mutate(),
  };
}
