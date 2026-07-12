import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormField } from '../../components/FormField';
import { DisclaimerFooter } from '../../components/DisclaimerFooter';
import { showToast } from '../../components/Toast';
import { usePixPayment, CopiaECola } from '../../components/PixPaymentCore';

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

function PayPage() {
  const { challengeId: challengeIdParam, token } = Route.useSearch();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    charge,
    status,
    isPaid,
    isChallengeActive,
    chargeMutation,
    pixKey,
    setPixKey,
    challengeSummary,
  } = usePixPayment({ challengeId: challengeIdParam, token });

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [user, navigate]);

  const challengeId = charge?.challengeId ?? challengeIdParam;
  const navigatedToChallengeRef = useRef(false);

  // When the paid participant is the one who filled the group (CHAL-06), the
  // challenge auto-transitions to ACTIVE — surface that and hand off to the
  // challenge detail screen instead of leaving the participant stuck here.
  // This is a route-level concern (navigate side-effect) that stays out of
  // the shared usePixPayment hook — PixOverlay (web) does NOT navigate.
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
