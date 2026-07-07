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
  const { user, setUser } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      void navigate({ to: '/' });
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
        setUser(body.user);
        void navigate({ to: '/' });
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
