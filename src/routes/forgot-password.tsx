import { createFileRoute, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { apiClient } from '../api/client';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../lib/breakpoints';

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido.'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  // null = form; string = success (the submitted email, D-16 in-place swap)
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const onSubmit = async ({ email }: ForgotPasswordFormData) => {
    setServerError(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      if (res.ok) {
        // ALWAYS set — regardless of whether the account exists (D-06/D-16,
        // unconditional anti-enumeration guarantee). Never branch into a
        // "email not found" state here.
        setSentTo(email);
      } else if (res.status === 429) {
        setServerError('Muitas tentativas. Tenta de novo em alguns minutos.');
      } else {
        setServerError('Erro de conexão. Tente novamente.');
      }
    } catch {
      setServerError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Computed unconditionally (before any early return) so the rules of
  // hooks stay satisfied regardless of which branch is taken (D-18, same
  // hoist pattern as login.tsx/signup.tsx/invites/$token.tsx).
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  // Error banner — tokens-only version (§Color of the UI-SPEC). Unlike
  // login.tsx/signup.tsx this file is 100% new, so there is no grandfathered
  // hex exception (WEB-05) — this banner cannot copy their hardcoded hex.
  const errorBanner = serverError && (
    <div
      role="alert"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--coral)',
        borderRadius: 12,
        padding: '11px 14px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span>⚠️</span>
      <span style={{ color: 'var(--coral)', fontWeight: 600, fontSize: '0.88rem' }}>
        {serverError}
      </span>
    </div>
  );

  const formCard = (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 24,
        padding: 28,
      }}
    >
      <h1
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'var(--green-ink)',
          marginBottom: 6,
        }}
      >
        Esqueceu a senha?
      </h1>
      <p style={{ margin: '0 0 18px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>
        Relaxa. Manda seu email que a gente te ajuda a voltar.
      </p>
      {errorBanner}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          id="rec-email"
          label="Email"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          error={errors.email?.message}
          registration={register('email')}
        />
        <PrimaryButton type="submit" loading={loading} disabled={!isValid}>
          Enviar link de recuperação
        </PrimaryButton>
      </form>
      <p style={{ textAlign: 'center', margin: '14px 0 0', fontSize: '0.9rem' }}>
        <Link to="/login" style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}>
          ← Voltar pro login
        </Link>
      </p>
    </div>
  );

  const successCard = (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 24,
        padding: '36px 28px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--mint)',
          fontSize: '1.6rem',
        }}
      >
        📬
      </span>
      <h1
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'var(--green-ink)',
          margin: '12px 0 6px',
        }}
      >
        Link enviado!
      </h1>
      <p style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>
        Se <strong style={{ color: 'var(--ink)' }}>{sentTo}</strong> tiver conta, o link de recuperação
        chega em instantes. Vale conferir o spam.
      </p>
      <Link
        to="/login"
        style={{ fontSize: '0.9rem', color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}
      >
        Voltar pro login →
      </Link>
    </div>
  );

  // Miolo (form + success) is a single unit — isWeb swaps only the container.
  const content = sentTo === null ? formCard : successCard;

  if (!isWeb) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px 26px',
        }}
      >
        {content}
      </section>
    );
  }

  // --- Web layout (>=768px, PWD-03) --------------------------------------
  // Bare centered card (D-18) — /forgot-password is a PUBLIC_ROUTE and also
  // in BARE_WHEN_AUTHED, so this branch renders without WebShell chrome.
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 48 }}>
      <div style={{ width: 'min(440px,100%)' }}>{content}</div>
    </div>
  );
}
