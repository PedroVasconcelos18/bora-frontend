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
 */
export function usePixPayment({ challengeId: challengeIdParam, token }: UsePixPaymentArgs) {
  const { user } = useAuthStore();
  const [pixKey, setPixKey] = useState('');
  const [charge, setCharge] = useState<ChargeResult | null>(null);
  const firedOnce = useRef(false);

  // Both the invitee ("aceitar e pagar") and creator ("pagar minha entrada")
  // paths converge on the same charge request here (D-13) — only the target
  // path + body shape differ depending on whether we arrived via an invite token.
  const chargeMutation = useMutation({
    mutationFn: async (key: string | undefined) => {
      const path = token ? `/invites/${token}/accept-and-pay` : '/participants/me/pay';
      const body = token
        ? { pixKey: key || undefined }
        : { challengeId: challengeIdParam, pixKey: key || undefined };
      const res = await apiClient.post(path, body);
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? 'Erro ao gerar cobrança Pix. Tente novamente.');
      }
      return (await res.json()) as ChargeResult;
    },
    onSuccess: (data) => {
      setCharge(data);
    },
    onError: (err: Error) => {
      showToast(err.message ?? 'Erro ao gerar cobrança Pix.');
    },
  });

  // Fire the initial charge exactly once on mount (per plan: "on mount it
  // POSTs to the charge endpoint"). Regeneration reuses the same mutation
  // with whatever pixKey the user has typed since.
  useEffect(() => {
    if (!user || firedOnce.current) return;
    if (!challengeIdParam && !token) return;
    firedOnce.current = true;
    chargeMutation.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, challengeIdParam, token]);

  // retry — re-fires the SAME charge mutation after a failure (gap UAT 07).
  // TRAP (d), non-negotiable: this must NEVER un-latch `firedOnce` — that ref
  // is the only thing preventing the mount effect above from re-firing and
  // issuing a duplicate charge POST, and this core is shared by three call
  // sites. Retry works by calling `mutate` directly; the mount effect stays
  // fired-once forever. The isPending guard stops an impatient double-click
  // from firing two overlapping charges.
  const retry = useCallback(() => {
    if (chargeMutation.isPending) return;
    chargeMutation.mutate(pixKey || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargeMutation.isPending, pixKey]);

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
    isError: chargeMutation.isError,
    errorMessage: chargeMutation.error?.message ?? null,
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
