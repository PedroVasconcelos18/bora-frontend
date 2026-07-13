import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import { showToast } from './Toast';

export interface ChargeResult {
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  expiresAt: string;
  paymentId: string;
  participantId: string;
  challengeId: string;
}

export interface ChallengeSummary {
  title: string;
  emoji: string;
  collabAmount: string;
}

export interface PaymentStatus {
  participantStatus: string;
  paymentStatus: string | null;
  challengeStatus: string;
}

interface UsePixPaymentArgs {
  challengeId?: string;
  token?: string;
}

/**
 * ChargeError — a charge failure that remembers WHICH path it failed on.
 *
 * A 404 on the invite accept path means "this invite token was already
 * consumed" (the user is already a participant and their money is fine), which
 * is a completely different situation from "the PSP refused the charge". The
 * hook can only tell them apart if the thrown error carries the status AND
 * whether the token path was the one that was used.
 */
export class ChargeError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly usedTokenPath: boolean,
  ) {
    super(message);
    this.name = 'ChargeError';
  }
}

/**
 * resolveChargeRequest — the SINGLE source of truth for which endpoint a charge
 * targets. The mutation function must not re-derive this inline.
 *
 * Rule: use the invite accept path ONLY while `token` is present AND
 * `tokenSpent` is false. Once the invite has been consumed (successful charge,
 * cache hydrate, or a 404 from the backend) that token is dead forever, and
 * every subsequent charge — including a user-initiated regenerate — must go
 * through the participant charge path.
 */
export function resolveChargeRequest(args: {
  token?: string;
  challengeId?: string;
  tokenSpent: boolean;
  pixKey?: string;
}): { path: string; body: Record<string, unknown> } {
  const pixKey = args.pixKey || undefined;
  if (args.token && !args.tokenSpent) {
    return { path: `/invites/${args.token}/accept-and-pay`, body: { pixKey } };
  }
  return { path: '/participants/me/pay', body: { challengeId: args.challengeId, pixKey } };
}

/** Namespaced session-storage key for a token's cached charge. */
export const pixChargeCacheKey = (token: string) => `bora.pix-charge.${token}`;

/**
 * The browser's session storage, or null when it does not exist (node/vitest)
 * or is unreachable (Safari private mode throws on access).
 *
 * sessionStorage, deliberately NOT localStorage: a Pix QR is per-tab and must
 * not outlive the session on a shared machine.
 */
function getStore(): Storage | null {
  try {
    const store = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

/** Shape guard — a stored record is only usable if it carries a userId and a charge with a QR. */
function isCachedRecord(v: unknown): v is { userId: string; charge: ChargeResult } {
  if (!v || typeof v !== 'object') return false;
  const rec = v as { userId?: unknown; charge?: unknown };
  if (typeof rec.userId !== 'string' || !rec.charge || typeof rec.charge !== 'object') return false;
  const charge = rec.charge as Partial<ChargeResult>;
  return (
    typeof charge.qrCode === 'string' &&
    typeof charge.qrCodeBase64 === 'string' &&
    typeof charge.expiresAt === 'string' &&
    typeof charge.participantId === 'string' &&
    typeof charge.challengeId === 'string'
  );
}

/**
 * readCachedCharge — the durable half of the remount guard.
 *
 * The backend NEVER persists the QR / copia-e-cola / expiry (only externalId +
 * status), so after a remount this cache is the ONLY way to put the invitee's
 * live charge back on screen. Returns null on: no store, no key, bad JSON, bad
 * shape, or a userId that is not the logged-in user (a stale entry must never
 * render one person's charge into another account in the same tab). Never throws.
 */
export function readCachedCharge(
  token: string,
  userId: string,
  store: Storage | null = getStore(),
): ChargeResult | null {
  if (!store) return null;
  try {
    const raw = store.getItem(pixChargeCacheKey(token));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCachedRecord(parsed)) return null;
    if (parsed.userId !== userId) return null;
    return parsed.charge;
  } catch {
    return null;
  }
}

/** writeCachedCharge — the ONLY writer. Silent no-op with no store or on a quota throw. */
export function writeCachedCharge(
  token: string,
  userId: string,
  charge: ChargeResult,
  store: Storage | null = getStore(),
): void {
  if (!store) return;
  try {
    store.setItem(pixChargeCacheKey(token), JSON.stringify({ userId, charge }));
  } catch {
    /* quota / private mode — the cache is an optimisation, never a hard dependency */
  }
}

/**
 * usePixPayment — the shared Pix payment core (D-12).
 *
 * Extracted, byte-for-byte, from the charge/poll/regenerate logic that used
 * to live inline in `participants/pay.tsx`. Consumed by BOTH the mobile
 * `/participants/pay` route AND the web `PixOverlay` modal so no payment
 * logic is duplicated.
 *
 * Route-level concerns (the `/login` redirect and the isChallengeActive
 * auto-navigate side-effect) intentionally stay OUT of this hook — they
 * remain in `pay.tsx` (mobile) since `PixOverlay` (web) must NOT navigate,
 * it only closes in place.
 *
 * CHARGE PHASE IS MIRRORED INTO LOCAL STATE — read this before "simplifying".
 * Every charge-phase flag this hook exports (isPending / isError /
 * errorMessage) is derived from a local `phase` state written by the
 * mutation's OPTION callbacks (onMutate / onSuccess / onError). It is NOT
 * read off the mutation result snapshot, because that snapshot is not
 * reliable across a subscription teardown: the charge is fired from a mount
 * effect, and StrictMode's mount→unmount→remount cycle tears the result
 * subscription down mid-flight. The subscription is never re-established
 * (only re-invoking the mutation through the observer would do that, and the
 * fired-once latch below correctly prevents exactly that), so the snapshot
 * freezes at "pending" forever — the error never surfaces and every button
 * gated on the snapshot's pending flag stays disabled for good.
 *
 * The option callbacks are immune to this: the mutation invokes them directly
 * on its own options object, with no dependency on the result subscription.
 * They must therefore stay declared in the useMutation({ ... }) options —
 * moving them to a per-call mutate(vars, { ... }) second argument would route
 * them back through the very subscription that breaks, and they would be just
 * as dead.
 */
export function usePixPayment({ challengeId: challengeIdParam, token }: UsePixPaymentArgs) {
  const { user } = useAuthStore();
  const [pixKey, setPixKey] = useState('');
  const [charge, setCharge] = useState<ChargeResult | null>(null);
  const [phase, setPhase] = useState<'idle' | 'pending' | 'error' | 'invite-consumed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const firedOnce = useRef(false);

  // Refs, NOT state: the mutation function must read their CURRENT value at
  // mutate() time, never a stale render closure.
  const chargeRef = useRef<ChargeResult | null>(null);
  // True once the invite token has been consumed. Set in exactly three places:
  // a successful charge, a hydrate-from-cache hit, and a backend 404 on the
  // token path. Once true, the token path is dead and resolveChargeRequest
  // sends every further charge to the participant endpoint.
  const tokenSpentRef = useRef(false);

  // Both the invitee ("aceitar e pagar") and creator ("pagar minha entrada")
  // paths converge on the same charge request here (D-13) — resolveChargeRequest
  // is the single source of truth for which endpoint is targeted.
  const chargeMutation = useMutation({
    mutationFn: async (key: string | undefined) => {
      const usedTokenPath = !!token && !tokenSpentRef.current;
      const { path, body } = resolveChargeRequest({
        token,
        challengeId: chargeRef.current?.challengeId ?? challengeIdParam,
        tokenSpent: tokenSpentRef.current,
        pixKey: key,
      });
      const res = await apiClient.post(path, body);
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new ChargeError(
          errBody.message ?? 'Erro ao gerar cobrança Pix. Tente novamente.',
          res.status,
          usedTokenPath,
        );
      }
      return (await res.json()) as ChargeResult;
    },
    // These three callbacks MUST stay here, in the useMutation options object.
    // The mutation invokes them directly on its own options, so they keep
    // running even after the result subscription has been torn down (see the
    // hook docblock). Do NOT move them into a per-call mutate(vars, { ... })
    // second argument — those are dispatched through the result subscription
    // and would be just as dead as the snapshot.
    onMutate: () => {
      setPhase('pending');
      setErrorMessage(null);
    },
    onSuccess: (data) => {
      chargeRef.current = data;
      tokenSpentRef.current = true;
      setCharge(data);
      setPhase('idle');
      // The ONLY writer of the durable cache. Without this line the mount
      // hydrate below has nothing to read and the whole remount fix is inert.
      if (token && user) writeCachedCharge(token, user.id, data);
    },
    onError: (err: Error) => {
      // ALREADY-CONSUMED INVITE, not a payment failure: the backend rejected
      // the token because this person is already in the challenge. Their money
      // is fine — do not shout a scary failure at them.
      if (err instanceof ChargeError && err.usedTokenPath && err.status === 404) {
        tokenSpentRef.current = true; // never touch the dead token path again
        setPhase('invite-consumed');
        setErrorMessage(null);
        return;
      }
      const message = err.message ?? 'Erro ao gerar cobrança Pix.';
      setPhase('error');
      setErrorMessage(message);
      showToast(message);
    },
  });

  // The charge-phase flags the UI reads. Derived from local state, never from
  // the mutation result snapshot.
  const isPending = phase === 'pending';
  const isError = phase === 'error';
  const isInviteConsumed = phase === 'invite-consumed';

  // Fire the initial charge exactly once on mount — but ONLY after checking the
  // durable per-token cache first.
  //
  // THE EARLY RETURN BELOW IS THE ZERO-EXTRA-POST GUARANTEE. `firedOnce` is a
  // per-mount ref, so it dies with the component: a browser Back→Forward onto
  // the ?autopay=true URL remounts this hook with a fresh latch and would
  // re-POST accept-and-pay against an already-consumed token (404) — painting a
  // FALSE failure card over a charge that actually succeeded. Hydrating from the
  // session cache restores the real charge (QR, countdown, polling all key off
  // it) with zero network writes, which makes revisiting the autopay URL inert
  // by construction. No history rewriting needed; the user's live QR survives.
  useEffect(() => {
    if (!user || firedOnce.current) return;
    if (!challengeIdParam && !token) return;
    firedOnce.current = true;

    if (token) {
      const cached = readCachedCharge(token, user.id);
      if (cached) {
        chargeRef.current = cached;
        tokenSpentRef.current = true;
        setCharge(cached);
        setPhase('idle');
        return; // <- no mutate(). No POST. No second Mercado Pago charge.
      }
    }

    chargeMutation.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, challengeIdParam, token]);

  // retry — re-fires the SAME charge mutation after a failure (gap UAT 07).
  // TRAP (d), non-negotiable: this must NEVER un-latch `firedOnce` — that ref
  // is the only thing preventing the mount effect above from re-firing and
  // issuing a duplicate charge POST, and this core is shared by three call
  // sites. Retry works by calling `mutate` directly; the mount effect stays
  // fired-once forever. The in-flight guard below stops an impatient
  // double-click from firing two overlapping charges — it reads the local
  // phase, not the frozen result snapshot, so it actually releases.
  const retry = useCallback(() => {
    if (phase === 'pending') return;
    chargeMutation.mutate(pixKey || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pixKey]);

  const challengeId = charge?.challengeId ?? challengeIdParam;

  const { data: challengeSummary } = useQuery<ChallengeSummary>({
    queryKey: ['challenge-summary', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}`);
      if (!res.ok) throw new Error('challenge-not-found');
      return (await res.json()) as ChallengeSummary;
    },
    enabled: !!challengeId,
    retry: false,
  });

  const { data: status } = useQuery<PaymentStatus>({
    queryKey: ['payment-status', charge?.participantId],
    queryFn: async () => {
      const res = await apiClient.get(`/participants/${charge!.participantId}/payment-status`);
      if (!res.ok) throw new Error('status-error');
      return (await res.json()) as PaymentStatus;
    },
    enabled: !!charge?.participantId,
    // Stop polling once the webhook has confirmed the payment (APPROVED) —
    // there is nothing left to wait for from this hook's point of view.
    refetchInterval: (query) => (query.state.data?.paymentStatus === 'APPROVED' ? false : 4000),
  });

  const isPaid = status?.paymentStatus === 'APPROVED';
  const isChallengeActive = status?.challengeStatus === 'ACTIVE';

  // Expiration countdown (D-14, additive only) — derived from charge.expiresAt
  // (already returned by the backend, just not displayed before). Guarded so
  // it never touches the mutation/polling logic above; cleared on unmount.
  const [countdown, setCountdown] = useState('00:00');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!charge) {
      setCountdown('00:00');
      setIsExpired(false);
      return;
    }

    const expiresAtMs = new Date(charge.expiresAt).getTime();

    const tick = () => {
      if (isPaid) {
        setIsExpired(false);
        return;
      }
      const remainingMs = expiresAtMs - Date.now();
      if (remainingMs <= 0) {
        setCountdown('00:00');
        setIsExpired(true);
        return;
      }
      setIsExpired(false);
      const totalSeconds = Math.floor(remainingMs / 1000);
      const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const ss = String(totalSeconds % 60).padStart(2, '0');
      setCountdown(`${mm}:${ss}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [charge, isPaid]);

  return {
    charge,
    status,
    isPaid,
    isChallengeActive,
    chargeMutation,
    pixKey,
    setPixKey,
    challengeSummary,
    isExpired,
    countdown,
    isPending,
    isError,
    isInviteConsumed,
    errorMessage,
    retry,
  };
}

/**
 * CopiaECola — relocated verbatim from `participants/pay.tsx` (only its
 * showToast import path changed). Renders the Pix "copia e cola" code with a
 * copy-to-clipboard button.
 */
export function CopiaECola({ qrCode }: { qrCode: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = qrCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    showToast('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: 'var(--mint)',
        border: '1px solid var(--mint-deep)',
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <input
        readOnly
        value={qrCode}
        onClick={(e) => e.currentTarget.select()}
        aria-label="Código Pix copia-e-cola"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: '0.78rem',
          color: 'var(--green-ink)',
          fontFamily: 'monospace',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      />
      <button
        type="button"
        onClick={() => void handleCopy()}
        style={{
          background: 'var(--card)',
          color: 'var(--ink)',
          border: '2px solid var(--line)',
          borderRadius: 10,
          padding: '6px 10px',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          flexShrink: 0,
        }}
      >
        {copied ? '✓ Copiado' : '📋 Copiar código'}
      </button>
    </div>
  );
}
