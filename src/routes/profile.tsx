import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { apiClient } from '../api/client';
import { PrimaryButton } from '../components/PrimaryButton';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, clearUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await apiClient.delete('/auth/logout');
    } catch {
      // ignore
    }
    clearUser();
    void navigate({ to: '/login' });
  };

  return (
    <main style={{ padding: '20px 18px 96px', flex: 1 }}>
      <div style={{ marginBottom: 14 }}>
        <h2
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontSize: '1.55rem',
            fontWeight: 800,
            color: 'var(--ink)',
          }}
        >
          Perfil
        </h2>
      </div>

      {/* Profile card */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          padding: 18,
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--green-bright)',
            color: 'var(--green-ink)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '1.7rem',
            margin: '0 auto 10px',
          }}
        >
          {user.name[0].toUpperCase()}
        </div>
        <h3
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontSize: '1.3rem',
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {user.name}
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{user.email}</p>
      </div>

      {/* "Não é aposta" block — PROF-02 */}
      <div
        style={{
          background: 'var(--ink)',
          color: 'var(--paper)',
          borderRadius: 14,
          padding: '14px 16px',
          fontSize: '0.82rem',
          lineHeight: 1.5,
          marginBottom: 16,
        }}
      >
        O{' '}
        <b style={{ color: 'var(--green-bright)' }}>Bora</b> é uma plataforma de gerenciamento de
        desafios de hábito entre amigos, feita pra estimular comportamentos saudáveis.{' '}
        <b style={{ color: 'var(--green-bright)' }}>Não é aposta nem bolão</b>: a colaboração
        funciona como incentivo e volta pra quem mantém o hábito combinado.
      </div>

      {/* Logout */}
      <PrimaryButton
        onClick={() => void handleLogout()}
        type="button"
      >
        Sair da conta
      </PrimaryButton>
    </main>
  );
}
