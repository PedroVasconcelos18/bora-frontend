import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { apiClient } from '../api/client';
import { NotBetBlock } from '../components/NotBetBlock';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

interface Participant {
  id: string;
  user: { id: string; name: string; email: string };
  status: string;
  paidAt: string | null;
}

interface Challenge {
  id: string;
  title: string;
  emoji: string;
  status: string;
  participants: Participant[];
}

function ProfilePage() {
  const { user, clearUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [user, navigate]);

  // Fetch challenges to compute aggregate stats (PROF-01 aggregation — Phase 4 wires real counters)
  const { data: challenges } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await apiClient.get('/challenges');
      if (!res.ok) return [];
      return (await res.json()) as Challenge[];
    },
    enabled: !!user,
  });

  if (!user) return null;

  // Aggregate placeholders — Phase 4 (PROF-01) will compute real validated-day counts from evidences/votes.
  const activeCount = (challenges ?? []).filter((c) => c.status === 'ACTIVE').length;
  const validatedDays = 0; // Phase 4 PROF-01 aggregation placeholder

  const handleLogout = async () => {
    try {
      await apiClient.delete('/auth/logout');
    } catch {
      // ignore — session cleared client-side regardless
    }
    clearUser();
    void navigate({ to: '/login' });
  };

  return (
    <main style={{ padding: '20px 18px 96px', flex: 1 }}>
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
          Perfil
        </h2>
      </div>

      {/* Profile card — avatar + name + email */}
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
        {/* Avatar */}
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
        {/* Name */}
        <h3
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontSize: '1.3rem',
            fontWeight: 700,
            marginBottom: 4,
            color: 'var(--ink)',
          }}
        >
          {user.name}
        </h3>
        {/* Email */}
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{user.email}</p>
      </div>

      {/* Stat cards — Desafios ativos + Dias validados (PROF-02 aggregate stats) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.8rem',
              color: 'var(--green-ink)',
              lineHeight: 1.1,
            }}
          >
            {activeCount}
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginTop: 4,
            }}
          >
            Desafios ativos
          </div>
        </div>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.8rem',
              color: 'var(--green-ink)',
              lineHeight: 1.1,
            }}
          >
            {validatedDays}
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginTop: 4,
            }}
          >
            Dias validados
          </div>
        </div>
      </div>

      {/* "Não é aposta" block — PROF-02 (above logout button) */}
      <div style={{ marginBottom: 16 }}>
        <NotBetBlock />
      </div>

      {/* Ghost "Sair da conta" button — AUTH-03 */}
      <button
        type="button"
        onClick={() => void handleLogout()}
        style={{
          width: '100%',
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1rem',
          padding: '14px 22px',
          borderRadius: 16,
          background: 'var(--card)',
          color: 'var(--ink)',
          border: '2px solid var(--line)',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--green-bright)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line)';
        }}
      >
        Sair da conta
      </button>
    </main>
  );
}
