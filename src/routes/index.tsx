import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { apiClient } from '../api/client';
import { ChallengeCard } from '../components/ChallengeCard';
import { PrimaryButton } from '../components/PrimaryButton';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

interface Participant {
  id: string;
  user: { id: string; name: string; email: string };
  status: string;
}

interface Challenge {
  id: string;
  title: string;
  emoji: string;
  durationDays: number;
  collabAmount: string;
  platformFee: string;
  status: string;
  participants: Participant[];
  createdAt: string;
}

function IndexPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [user, navigate]);

  // Fetch challenges via GET /challenges
  const { data: challenges, isLoading } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await apiClient.get('/challenges');
      if (!res.ok) return [];
      return (await res.json()) as Challenge[];
    },
    enabled: !!user,
  });

  if (!user) return null;

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
          Seus desafios 👋
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
          Bora manter a sequência, {user.name.split(' ')[0]}?
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
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
      )}

      {/* Challenge list or empty state */}
      {!isLoading && challenges && challenges.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              id={challenge.id}
              title={challenge.title}
              emoji={challenge.emoji}
              durationDays={challenge.durationDays}
              collabAmount={challenge.collabAmount}
              platformFee={challenge.platformFee}
              status={challenge.status}
              participants={challenge.participants ?? []}
              onClick={() => void navigate({ to: '/' })} // placeholder until /challenges/$id route exists
            />
          ))}
        </div>
      ) : !isLoading ? (
        /* Empty state — verbatim from Copywriting Contract */
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
          <PrimaryButton onClick={() => void navigate({ to: '/challenges/new' })}>
            Criar primeiro desafio
          </PrimaryButton>
        </div>
      ) : null}
    </main>
  );
}
