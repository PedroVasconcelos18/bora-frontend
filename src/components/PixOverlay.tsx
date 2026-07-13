import type React from 'react';
import { useEffect } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { FormField } from './FormField';
import { usePixPayment, CopiaECola } from './PixPaymentCore';

interface PixOverlayProps {
  challengeId?: string;
  token?: string;
  onClose: () => void;
  title?: string;
}

/**
 * PixOverlay — the web modal wrapper (D-12) for the shared Pix payment core.
 *
 * Opens in-place over the waiting room (a dimmed backdrop, NOT a new route,
 * NOT a document.body portal) so the waiting room stays mounted behind it.
 * Renders exactly one state at a time: aguardando / confirmado / expirado / erro.
 * The modal is dismissable from EVERY state — backdrop click and ESC both
 * call onClose unconditionally (gap UAT 07). Unlike the mobile route, this
 * component never navigates — it only closes.
 */
export function PixOverlay({ challengeId, token, onClose, title }: PixOverlayProps) {
  const {
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
    errorMessage,
    retry,
  } = usePixPayment({ challengeId, token });

  const displayTitle = challengeSummary?.title ?? title ?? '';
  const formattedAmount = challengeSummary
    ? `R$ ${parseFloat(challengeSummary.collabAmount).toFixed(2).replace('.', ',')}`
    : '';

  // DISMISSAL, all states (gap UAT 07): ESC closes the modal unconditionally.
  // This listener does NOT live inside any state branch — that was the bug.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        // Only close when the click landed on the backdrop itself, not on
        // something inside the card (event target === current target).
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(11,59,34,.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          width: 'min(520px, calc(100vw - 48px))',
          background: 'var(--card)',
          borderRadius: 26,
          padding: 30,
          boxShadow: 'var(--shadow)',
        }}
      >
        {isExpired ? (
          <div style={{ textAlign: 'center', padding: '34px 0 0' }}>
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--card)',
                border: '2px solid var(--coral)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '2rem',
                margin: '0 auto 16px',
              }}
            >
              ⏱
            </span>
            <h2
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: '1.4rem',
                color: 'var(--coral)',
                marginBottom: 10,
              }}
            >
              Esse QR expirou
            </h2>
            <p style={{ color: 'var(--muted)', fontWeight: 600, marginBottom: 20 }}>
              Sem estresse — nada foi cobrado. Gera um novo código e paga em segundos.
            </p>
            <PrimaryButton
              onClick={() => chargeMutation.mutate(pixKey || undefined)}
              loading={isPending}
              disabled={isPending}
            >
              Gerar novo QR code
            </PrimaryButton>
            <div style={{ marginTop: 14 }}>
              <a
                onClick={onClose}
                style={{
                  color: 'var(--green)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Pagar depois
              </a>
            </div>
          </div>
        ) : isPaid ? (
          <div style={{ textAlign: 'center', padding: '34px 0 0' }}>
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--green-bright)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '2rem',
                color: 'var(--green-ink)',
                margin: '0 auto 16px',
              }}
            >
              ✓
            </span>
            <h2
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: '1.4rem',
                color: 'var(--green-ink)',
                marginBottom: 10,
              }}
            >
              Pagamento confirmado!
            </h2>
            <p style={{ color: 'var(--muted)', fontWeight: 600 }}>
              Você tá dentro do {displayTitle}. 💪
            </p>
            <p style={{ color: 'var(--muted)', marginTop: 4, marginBottom: 20 }}>
              {isChallengeActive
                ? '🚀 O desafio está no ar!'
                : 'O desafio começa quando todo mundo pagar. A gente te avisa.'}
            </p>
            <PrimaryButton onClick={onClose}>Voltar pro desafio</PrimaryButton>
          </div>
        ) : charge ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2
                style={{
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  color: 'var(--ink)',
                }}
              >
                Pagar entrada
              </h2>
              {formattedAmount && (
                <strong
                  style={{
                    fontFamily: '"Baloo 2", system-ui, sans-serif',
                    fontWeight: 800,
                    fontSize: '1.35rem',
                    color: 'var(--green-ink)',
                  }}
                >
                  {formattedAmount}
                </strong>
              )}
            </div>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--muted)', margin: '4px 0 18px' }}>
              {displayTitle} · sua colaboração via Pix
            </p>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <img
                src={`data:image/png;base64,${charge.qrCodeBase64}`}
                alt="QR code Pix"
                style={{
                  width: 210,
                  height: 210,
                  border: '1px solid var(--line)',
                  borderRadius: 16,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Ou copia e cola no app do banco
                </p>
                <CopiaECola qrCode={charge.qrCode} />
                <div
                  style={{
                    marginTop: 12,
                    display: 'inline-block',
                    background: 'var(--mint)',
                    color: 'var(--green-ink)',
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  ⏱ Esse QR expira em {countdown}
                </div>
              </div>
            </div>

            {(!status || status.paymentStatus === 'PENDING') && (
              <div
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 22,
                    height: 22,
                    border: '3px solid var(--mint-deep)',
                    borderTopColor: 'var(--green)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    flexShrink: 0,
                  }}
                />
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>
                  Aguardando confirmação do Pix… Cai na hora — a gente confirma automático.
                </p>
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <FormField
                id="pix-overlay-key"
                label="Sua chave Pix (para reembolso, caso o desafio seja cancelado)"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                registration={{
                  value: pixKey,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPixKey(e.target.value),
                }}
              />
            </div>

            <a
              onClick={onClose}
              style={{
                display: 'inline-block',
                color: 'var(--green)',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Pagar depois
            </a>
          </>
        ) : isError ? (
          <div style={{ textAlign: 'center', padding: '34px 0 0' }}>
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--card)',
                border: '2px solid var(--coral)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '2rem',
                margin: '0 auto 16px',
              }}
            >
              😕
            </span>
            <h2
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: '1.4rem',
                color: 'var(--coral)',
                marginBottom: 10,
              }}
            >
              Não rolou gerar o Pix
            </h2>
            <p style={{ color: 'var(--muted)', fontWeight: 600, marginBottom: errorMessage ? 4 : 20 }}>
              A gente não conseguiu criar a cobrança agora. Nada foi cobrado — tenta de novo em instantes.
            </p>
            {errorMessage && (
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 20 }}>{errorMessage}</p>
            )}
            <PrimaryButton onClick={retry} loading={isPending} disabled={isPending}>
              Tentar de novo
            </PrimaryButton>
            <div style={{ marginTop: 14 }}>
              <a
                onClick={onClose}
                style={{
                  color: 'var(--green)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Pagar depois
              </a>
            </div>
          </div>
        ) : (
          isPending && (
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
          )
        )}
      </div>
    </div>
  );
}
