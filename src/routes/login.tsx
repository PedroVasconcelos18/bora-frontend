import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { DisclaimerFooter } from '../components/DisclaimerFooter';
import { consumePendingInvite } from '../lib/pendingInvite';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../lib/breakpoints';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Single post-auth navigation authority: fires both when the user was
  // already authenticated on mount AND when a fresh login transitions
  // user null -> set (setUser alone does not re-trigger any other effect,
  // so this is the only place that decides where to go next). Resumes a
  // pending invite token if one was saved before the auth redirect (GAP 2).
  useEffect(() => {
    if (user) {
      const pendingToken = consumePendingInvite();
      if (pendingToken) {
        void navigate({ to: '/invites/$token', params: { token: pendingToken } });
      } else {
        void navigate({ to: '/home' });
      }
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const emailValue = watch('email');
  const passwordValue = watch('password');
  const isEmpty = !emailValue || !passwordValue;

  const onSubmit = async (data: LoginFormData) => {
    if (isEmpty) {
      setServerError('Preencha e-mail e senha.');
      return;
    }
    setServerError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', data);
      if (res.ok) {
        const body = (await res.json()) as { user: { id: string; email: string; name: string } };
        // Navigation is owned by the mount effect above (fires once on the
        // null -> set transition) — do not navigate here to avoid a double-consume race.
        setUser(body.user);
        // Seed the ['auth-me'] cache to agree with the store (07-06) — keeps
        // the boot-hydration query from holding a stale boot-time null.
        queryClient.setQueryData(['auth-me'], { user: body.user });
      } else if (res.status === 401) {
        setServerError('E-mail ou senha incorretos.');
      } else {
        setServerError('Erro ao entrar. Tente novamente.');
      }
    } catch {
      setServerError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    // Check for empty fields before running zod validation
    if (!emailValue?.trim() || !passwordValue?.trim()) {
      e.preventDefault();
      setServerError('Preencha e-mail e senha.');
      return;
    }
    void handleSubmit(onSubmit)(e);
  };

  // Computed unconditionally (before any early return) so the rules of
  // hooks stay satisfied regardless of which branch is taken (D-02, same
  // hoist pattern as home.tsx).
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  // Error banner — reused verbatim (same JSX/hex) by both the mobile and web
  // branches below via a single definition, so the pre-existing grandfathered
  // hex is not duplicated/copied into the new web branch.
  const errorBanner = serverError && (
    <div
      role="alert"
      style={{
        background: '#FFE2DA',
        color: '#c0392b',
        fontWeight: 600,
        fontSize: '0.88rem',
        padding: '11px 14px',
        borderRadius: 12,
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span>⚠️</span>
      <span>{serverError}</span>
    </div>
  );

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
        {/* Brand mark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 74,
              height: 74,
              borderRadius: 24,
              background: 'var(--green-bright)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 14px',
              transform: 'rotate(-7deg)',
              fontSize: '2.4rem',
              boxShadow: 'var(--shadow)',
            }}
          >
            ↑
          </div>
          <h1
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontSize: '2.6rem',
              fontWeight: 800,
              color: 'var(--green-ink)',
            }}
          >
            Bora
          </h1>
          <p style={{ color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
            Desafios de hábito entre amigos
          </p>
        </div>

        {/* Error banner */}
        {errorBanner}

        {/* Login form */}
        <form onSubmit={handleFormSubmit} noValidate>
          <FormField
            id="email"
            label="E-mail"
            type="email"
            placeholder="voce@email.com"
            autoComplete="username"
            error={errors.email?.message}
            registration={register('email')}
          />
          <FormField
            id="password"
            label="Senha"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            registration={register('password')}
          />

          <PrimaryButton
            type="submit"
            loading={loading}
            disabled={!isValid || isEmpty}
          >
            Entrar
          </PrimaryButton>
        </form>

        {/* Sign up link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: '0.9rem',
            color: 'var(--muted)',
          }}
        >
          Não tem conta?{' '}
          <Link
            to="/signup"
            style={{
              color: 'var(--green)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Criar conta
          </Link>
        </p>

        {/* "Não é aposta" disclaimer footer (PROF-02 / D-13) */}
        <DisclaimerFooter />
      </section>
    );
  }

  // --- Web layout (>=768px, FUN-01) -----------------------------------------
  // Bare centered auth card (D-01/D-04) — /login is already a PUBLIC_ROUTE
  // (Fase 5 D-13), so this branch renders without WebShell chrome. All
  // useForm/onSubmit/serverError logic above is reused unchanged; only the
  // JSX below is new.
  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 48 }}>
        <div style={{ width: 'min(440px,100%)' }}>
          {/* Brand mark */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontSize: '2.2rem',
                fontWeight: 800,
                color: 'var(--green-ink)',
              }}
            >
              Bora<span style={{ color: 'var(--green-bright)' }}>.</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.95rem', marginTop: 2 }}>
              Desafios de hábito entre amigos. Valendo.
            </p>
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 24,
              padding: 28,
              boxShadow: 'var(--shadow)',
            }}
          >
            <h2
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: 18,
              }}
            >
              Bora entrar
            </h2>

            {/* Error banner — reused from the single definition above, not copied/duplicated */}
            {errorBanner}

            <form onSubmit={handleFormSubmit} noValidate>
              <FormField
                id="login-email"
                label="Email"
                type="email"
                placeholder="voce@email.com"
                autoComplete="username"
                error={errors.email?.message}
                registration={register('email')}
              />
              <FormField
                id="login-senha"
                label="Senha"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                registration={register('password')}
              />

              {/* "Esqueci minha senha" omitted — /forgot-password does not
                  exist yet (Fase 8); do not link to a 404 (D-01/UI-SPEC). */}

              <PrimaryButton type="submit" loading={loading} disabled={!isValid || isEmpty}>
                Entrar
              </PrimaryButton>
            </form>

            <p
              style={{
                textAlign: 'center',
                marginTop: 18,
                fontSize: '0.9rem',
                color: 'var(--muted)',
              }}
            >
              Primeira vez por aqui?{' '}
              <Link
                to="/signup"
                style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>

      <DisclaimerFooter />
    </section>
  );
}
