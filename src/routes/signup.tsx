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
import { saveBlogReturn, consumeBlogReturn } from '../lib/blogReturn';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../lib/breakpoints';

const signupSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Single post-auth navigation authority: fires both when the user was
  // already authenticated on mount AND when a fresh signup transitions
  // user null -> set (setUser alone does not re-trigger any other effect,
  // so this is the only place that decides where to go next). Resumes a
  // pending invite token if one was saved before the auth redirect (GAP 2).
  // Um leitor do blog chega aqui por `/login?redirect=/blog/...` (ver
  // `bora_identidade_url_login()` no repo bora-blog). Guardar o destino na
  // CHEGADA é o que faz ele sobreviver a um desvio por /signup — o parâmetro
  // ficaria para trás na navegação entre as duas telas.
  useEffect(() => {
    saveBlogReturn(window.location.search);
  }, []);

  useEffect(() => {
    if (user) {
      const pendingToken = consumePendingInvite();
      if (pendingToken) {
        void navigate({ to: '/invites/$token', params: { token: pendingToken } });
        return;
      }

      // O blog é WordPress no mesmo domínio, FORA do router — a volta tem que
      // ser navegação de página inteira. `navigate` trataria /blog/... como
      // rota da SPA e cairia no catch-all.
      const voltarParaOBlog = consumeBlogReturn();
      if (voltarParaOBlog) {
        window.location.assign(voltarParaOBlog);
        return;
      }

      void navigate({ to: '/home' });
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: SignupFormData) => {
    setServerError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/signup', data);
      if (res.status === 201) {
        const body = (await res.json()) as { user: { id: string; email: string; name: string } };
        // Navigation is owned by the mount effect above (fires once on the
        // null -> set transition) — do not navigate here to avoid a double-consume race.
        setUser(body.user);
        // Seed the ['auth-me'] cache to agree with the store (07-06) — keeps
        // the boot-hydration query from holding a stale boot-time null.
        queryClient.setQueryData(['auth-me'], { user: body.user });
      } else if (res.status === 409) {
        setServerError('Este e-mail já tem uma conta. Faça login.');
      } else if (res.status === 400) {
        const body = (await res.json()) as { message?: string | string[] };
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        setServerError(msg ?? 'Dados inválidos. Verifique os campos.');
      } else {
        setServerError('Erro ao criar conta. Tente novamente.');
      }
    } catch {
      setServerError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Computed unconditionally (before any early return) so the rules of
  // hooks stay satisfied regardless of which branch is taken (D-02, same
  // hoist pattern as home.tsx / login.tsx).
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  // Error banner — reused verbatim (same JSX/hex, including the 409 "email
  // já em uso" case, D-06) by both branches via a single definition, so the
  // pre-existing grandfathered hex is not duplicated/copied into the web branch.
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

        {/* Signup form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField
            id="name"
            label="Nome"
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            error={errors.name?.message}
            registration={register('name')}
          />
          <FormField
            id="email"
            label="E-mail"
            type="email"
            placeholder="voce@email.com"
            autoComplete="email"
            error={errors.email?.message}
            registration={register('email')}
          />
          <div>
            <FormField
              id="password"
              label="Senha"
              type="password"
              placeholder="••••••••"
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

          <PrimaryButton type="submit" loading={loading} disabled={!isValid}>
            Criar conta
          </PrimaryButton>
        </form>

        {/* Login link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: '0.9rem',
            color: 'var(--muted)',
          }}
        >
          Já tem conta?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--green)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Entrar
          </Link>
        </p>

        {/* "Não é aposta" disclaimer footer (PROF-02 / D-13) */}
        <DisclaimerFooter />
      </section>
    );
  }

  // --- Web layout (>=768px, FUN-02) -----------------------------------------
  // Bare centered auth card (D-01/D-04) — /signup is already a PUBLIC_ROUTE
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
              Cria a conta e chama a turma.
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
              Criar conta
            </h2>

            {/* Error banner — reused from the single definition above (includes the
                409 "email já em uso" case, D-06) — no second inline field error added */}
            {errorBanner}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <FormField
                id="signup-name"
                label="Nome"
                type="text"
                placeholder="Seu nome"
                autoComplete="name"
                error={errors.name?.message}
                registration={register('name')}
              />
              <FormField
                id="signup-email"
                label="E-mail"
                type="email"
                placeholder="voce@email.com"
                autoComplete="email"
                error={errors.email?.message}
                registration={register('email')}
              />
              <div>
                <FormField
                  id="signup-password"
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
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

              <PrimaryButton type="submit" loading={loading} disabled={!isValid}>
                Criar minha conta
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
              Já tem conta?{' '}
              <Link
                to="/login"
                style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>

      <DisclaimerFooter />
    </section>
  );
}
