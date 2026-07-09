import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormField } from '../../components/FormField';
import { DisclaimerFooter } from '../../components/DisclaimerFooter';
import { showToast } from '../../components/Toast';

interface PaySearch {
  challengeId?: string;
  token?: string;
}

export const Route = createFileRoute('/participants/pay')({
  component: PayPage,
  validateSearch: (search: Record<string, unknown>): PaySearch => ({
    challengeId: typeof search.challengeId === 'string' ? search.challengeId : undefined,
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
});

interface ChargeResult {
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  expiresAt: string;
  paymentId: string;
  participantId: string;
  challengeId: string;
}

interface ChallengeSummary {
  title: string;
  emoji: string;
  collabAmount: string;
}

interface PaymentStatus {
  participantStatus: string;
  paymentStatus: string | null;
  challengeStatus: string;
}

function PayPage() {
  const { challengeId: challengeIdParam, token } = Route.useSearch();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [pixKey, setPixKey] = useState('');
  const [charge, setCharge] = useState<ChargeResult | null>(null);
  const firedOnce = useRef(false);

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [user, navigate]);

  // Both the invitee ("aceitar e pagar") and creator ("pagar minha entrada")
  // paths converge on the same charge request here (D-06) — only the target
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
  // POSTs to the charge endpoint"). Regeneration (D-08) reuses the same
  // mutation with whatever pixKey the user has typed since.
  useEffect(() => {
    if (!user || firedOnce.current) return;
    if (!challengeIdParam && !token) return;
    firedOnce.current = true;
    chargeMutation.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, challengeIdParam, token]);

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
    // there is nothing left to wait for from this screen's point of view.
    refetchInterval: (query) => (query.state.data?.paymentStatus === 'APPROVED' ? false : 4000),
  });

  const isChallengeActive = status?.challengeStatus === 'ACTIVE';
  const navigatedToChallengeRef = useRef(false);

  // When the paid participant is the one who filled the group (CHAL-06), the
  // challenge auto-transitions to ACTIVE — surface that and hand off to the
  // challenge detail screen instead of leaving the participant stuck here.
  useEffect(() => {
    if (!isChallengeActive || !challengeId || navigatedToChallengeRef.current) return;
    navigatedToChallengeRef.current = true;
    showToast('🚀 O desafio está no ar!');
    const timer = setTimeout(() => {
      void navigate({ to: '/challenges/$challengeId', params: { challengeId } });
    }, 1800);
    return () => clearTimeout(timer);
  }, [isChallengeActive, challengeId, navigate]);

  if (!user) return null;

  if (!challengeIdParam && !token) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px 26px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>😕</div>
        <p style={{ color: 'var(--muted)', fontWeight: 600 }}>Nenhum desafio para pagar.</p>
        <Link
          to="/home"
          style={{ color: 'var(--green)', fontWeight: 700, marginTop: 16, textDecoration: 'underline' }}
        >
          Voltar
        </Link>
      </section>
    );
  }

  const isPaid = status?.paymentStatus === 'APPROVED';

  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 26px',
      }}
    >
      <h2
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: '1.3rem',
          color: 'var(--ink)',
          marginBottom: 16,
        }}
      >
        Pagar entrada via Pix
      </h2>

      {challengeSummary && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'var(--mint)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}
            >
              {challengeSummary.emoji}
            </div>
            <div
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: 'var(--ink)',
              }}
            >
              {challengeSummary.title}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>
              Colaboração pra entrar
            </span>
            <strong style={{ fontFamily: '"Baloo 2", system-ui, sans-serif', fontWeight: 800, color: 'var(--green-ink)' }}>
              R$ {parseFloat(challengeSummary.collabAmount).toFixed(2).replace('.', ',')}
            </strong>
          </div>
        </div>
      )}

      {chargeMutation.isPending && !charge && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <span
            style={{
              display: 'inline-block',
              width: 32,
              height: 32,
              border: '3px solid var(--mint-deep)',
              borderTopColor: 'var(--green)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

      {isPaid ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
          <h3
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              color: 'var(--green-ink)',
            }}
          >
            Pagamento confirmado!
          </h3>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            {isChallengeActive
              ? '🚀 O desafio está no ar! Te levando pro dia 1...'
              : 'Aguardando o restante da turma pagar...'}
          </p>
          {challengeId && (
            <div style={{ marginTop: 20 }}>
              <Link
                to="/challenges/$challengeId"
                params={{ challengeId }}
                style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'underline' }}
              >
                Ver desafio
              </Link>
            </div>
          )}
        </div>
      ) : (
        charge && (
          <>
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              <img
                src={`data:image/png;base64,${charge.qrCodeBase64}`}
                alt="QR code Pix"
                style={{ width: 220, height: 220, margin: '0 auto 16px', borderRadius: 12 }}
              />
              <CopiaECola qrCode={charge.qrCode} />
              {(!status || status.paymentStatus === 'PENDING') && (
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 12 }}>
                  Aguardando confirmação do Pix...
                </p>
              )}
            </div>

            <FormField
              id="pixKey"
              label="Sua chave Pix (para reembolso, caso o desafio seja cancelado)"
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              registration={{
                value: pixKey,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPixKey(e.target.value),
              }}
            />

            <div style={{ marginTop: 8 }}>
              <PrimaryButton
                onClick={() => chargeMutation.mutate(pixKey || undefined)}
                loading={chargeMutation.isPending}
                disabled={chargeMutation.isPending}
              >
                Gerar novo QR
              </PrimaryButton>
            </div>
          </>
        )
      )}

      <DisclaimerFooter />
    </section>
  );
}

function CopiaECola({ qrCode }: { qrCode: string }) {
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
