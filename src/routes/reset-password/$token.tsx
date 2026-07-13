import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { apiClient } from '../../api/client';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { showToast } from '../../components/Toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../lib/breakpoints';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não são iguais.',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const Route = createFileRoute('/reset-password/$token')({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  // Validated ON MOUNT (D-12) — mirrors invites/$token.tsx: the user sees
  // "link expired" before typing the new password twice.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reset-token-valid', token],
    queryFn: async () => {
      const res = await apiClient.get(`/auth/reset-password/${token}`);
      if (!res.ok) throw new Error('invalid');
      return (await res.json()) as { valid: boolean };
    },
    retry: false,
  });

  const [submitted, setSubmitted] = useState(false);
  // D-13: a token that dies at submit time (rare race) collapses into the
  // SAME "invalid" card as a token that was already dead on mount — never a
  // second distinct card.
  const [submitTokenDied, setSubmitTokenDied] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tokenIsInvalid = isError || (data !== undefined && !data.valid) || submitTokenDied;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  });

  const onSubmit = async ({ password }: ResetPasswordFormData) => {
    setServerError(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/reset-password', { token, password });
      if (res.ok) {
        setSubmitted(true);
      } else if (res.status === 400 || res.status === 404 || res.status === 410) {
        // Token died between the mount GET and this submit — collapse into
        // the same "invalid or expired" card (D-13). The backend intentionally
        // never returns the unauthorized status for a dead token — see the
        // plan's <api_contract> for why fetchWithRefresh must never replay
        // this POST for an authed visitor.
        setSubmitTokenDied(true);
      } else if (res.status === 429) {
        setServerError('Muitas tentativas. Tenta de novo em alguns minutos.');
      } else {
        setServerError('Não rolou salvar a senha nova. Tenta de novo em instantes.');
      }
    } catch {
      setServerError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Computed unconditionally (before any early return) so the rules of
  // hooks stay satisfied — this component has the most early returns of the
  // phase (isLoading, tokenIsInvalid...), so this is the easiest file to
  // break the rule in (D-18).
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

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

  // --- State 1: checking (isLoading) — no card yet, mirrors invites/$token.tsx
  const loadingContent = (
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
  );

  // --- State 2: token inválido (D-13) — mint circle, NOT coral (D-17 deliberate)
  const invalidCard = (
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
        😕
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
        Link inválido ou expirado
      </h1>
      <p style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>
        Esse link não vale mais. Pede um novo abaixo.
      </p>
      <div style={{ marginBottom: 12 }}>
        <PrimaryButton onClick={() => void navigate({ to: '/forgot-password' })}>
          Pedir novo link
        </PrimaryButton>
      </div>
      <Link
        to="/login"
        style={{ fontSize: '0.9rem', color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}
      >
        Voltar ao login
      </Link>
    </div>
  );

  // --- State 3: form (token válido) — clones the 2c card language (D-17)
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
        Criar nova senha
      </h1>
      <p style={{ margin: '0 0 18px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>
        Escolhe uma senha nova pra voltar a entrar. Por segurança, suas sessões atuais serão
        encerradas.
      </p>
      {errorBanner}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <FormField
            id="reset-password"
            label="Nova senha"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            error={errors.password?.message}
            registration={register('password')}
          />
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--muted)',
              marginTop: -10,
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            Mínimo 8 caracteres.
          </p>
        </div>
        <FormField
          id="reset-password-confirm"
          label="Confirmar nova senha"
          type="password"
          placeholder="Repete a senha nova"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          registration={register('confirmPassword')}
        />
        <PrimaryButton type="submit" loading={loading} disabled={!isValid}>
          Salvar nova senha
        </PrimaryButton>
      </form>
      <p style={{ textAlign: 'center', margin: '14px 0 0', fontSize: '0.9rem' }}>
        <Link to="/login" style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}>
          ← Voltar pro login
        </Link>
      </p>
    </div>
  );

  // --- State 4: sucesso (D-15 x D-17 reconciliation) — in-place card whose
  // single CTA fires the toast AND navigates on the same click; no auto-login.
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
        ✓
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
        Senha redefinida!
      </h1>
      <p style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>
        Sua senha foi trocada. Entra de novo com a senha nova.
      </p>
      <PrimaryButton
        onClick={() => {
          showToast('Senha redefinida! Entra com sua senha nova.');
          void navigate({ to: '/login' });
        }}
      >
        Ir para o login
      </PrimaryButton>
    </div>
  );

  let content: React.ReactNode;
  if (isLoading) {
    content = loadingContent;
  } else if (submitted) {
    content = successCard;
  } else if (tokenIsInvalid) {
    content = invalidCard;
  } else {
    content = formCard;
  }

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

  // --- Web layout (>=768px, PWD-04) --------------------------------------
  // Bare centered card (D-18) — /reset-password is a PUBLIC_ROUTE and also
  // in BARE_WHEN_AUTHED, so this branch renders without WebShell chrome.
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 48 }}>
      <div style={{ width: 'min(440px,100%)' }}>{content}</div>
    </div>
  );
}
