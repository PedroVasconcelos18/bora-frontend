import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { DisclaimerFooter } from '../components/DisclaimerFooter';
import { consumePendingInvite } from '../lib/pendingInvite';

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
  const { user, setUser } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Single post-auth navigation authority: fires both when the user was
  // already authenticated on mount AND when a fresh signup transitions
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
      {serverError && (
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
      )}

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
