import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

function IndexPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main style={{ padding: '20px 18px 96px' }}>
      {/* Section heading */}
      <div style={{ marginBottom: 14 }}>
        <h2
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontSize: '1.55rem',
            fontWeight: 800,
            color: 'var(--ink)',
          }}
        >
          Seus desafios
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
          Olá, {user.name.split(' ')[0]}! Seus desafios aparecerão aqui.
        </p>
      </div>

      {/* Empty state */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 20,
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏃</div>
        <h3
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontSize: '1.1rem',
            fontWeight: 700,
            marginBottom: 8,
            color: 'var(--ink)',
          }}
        >
          Nenhum desafio ainda
        </h3>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '0.9rem',
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          Crie um desafio e chame seus amigos para começar.
        </p>
      </div>
    </main>
  );
}
