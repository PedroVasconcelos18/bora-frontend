import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { apiClient } from '../api/client';
import { ChallengeCard } from '../components/ChallengeCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { PendenciasCard } from '../components/PendenciasCard';
import { NotBetBlock } from '../components/NotBetBlock';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../lib/breakpoints';

export const Route = createFileRoute('/home')({
  component: HomePage,
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

function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

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

  // D-13/D-12: this route body renders inside BOTH the mobile device tree
  // and the web WebShell tree (__root.tsx's single <Outlet/> mounts it in
  // either case) — this internal gate is the only way to keep the
  // pre-existing mobile JSX byte-identical while adding the web layout
  // beside it. Computed unconditionally (before any early return) so the
  // rules of hooks stay satisfied regardless of which branch is taken.
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  if (!user) return null;

  if (!isWeb) {
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
                onClick={() =>
                  void navigate({
                    to: '/challenges/$challengeId',
                    params: { challengeId: challenge.id },
                  })
                }
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

        {/* "Não é aposta" — posicionamento legal/produto na página Desafios */}
        <div style={{ marginTop: 20 }}>
          <NotBetBlock />
        </div>
      </main>
    );
  }

  // --- Web layout (>=768px, DASH-01/02/03) ---------------------------------
  const firstName = user.name.split(' ')[0];
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const hasChallenges = !isLoading && challenges && challenges.length > 0;
  const isEmptyDashboard = !isLoading && (!challenges || challenges.length === 0);

  // DASH-03 — shimmer skeleton block, tokens-only gradient (WEB-05). Never
  // the canvas gradient hexes — composed from var(--line)/var(--card) only.
  const shimmerBlockStyle = (height: number, width?: number, borderRadius = 20) => ({
    height,
    width,
    background: 'linear-gradient(100deg, var(--line) 40%, var(--card) 50%, var(--line) 60%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius,
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, alignItems: 'flex-start' }}>
      <div style={{ flex: '2 1 480px', minWidth: 0 }}>
        {isLoading ? (
          <>
            <div style={{ ...shimmerBlockStyle(14, 220, 10), marginBottom: 10 }} />
            <div style={{ ...shimmerBlockStyle(32, 300, 10), marginBottom: 18 }} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
                marginBottom: 18,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={shimmerBlockStyle(152)} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 20,
                  height: 20,
                  border: '3px solid var(--mint-deep)',
                  borderTopColor: 'var(--green)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.78rem' }}>
                Carregando seus desafios…
              </span>
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}>
              E aí, {firstName}! · {todayLabel}
            </div>
            <h1
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: '1.9rem',
                lineHeight: 1.1,
                color: 'var(--green-ink)',
              }}
            >
              Seus desafios
            </h1>
          </div>
        )}

        {hasChallenges && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {challenges!.map((challenge) => (
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
                onClick={() =>
                  void navigate({
                    to: '/challenges/$challengeId',
                    params: { challengeId: challenge.id },
                  })
                }
              />
            ))}
            <button
              type="button"
              onClick={() => void navigate({ to: '/challenges/new' })}
              style={{
                border: '2px dashed var(--mint-deep)',
                borderRadius: 20,
                background: 'none',
                display: 'grid',
                placeItems: 'center',
                minHeight: 150,
                color: 'var(--muted)',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--mint)';
                e.currentTarget.style.color = 'var(--green-ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              + Bora criar mais um
            </button>
          </div>
        )}

        {isEmptyDashboard && (
          /* DASH-02 — verbatim mobile copy (D-09), desktop wrapper only */
          <div
            style={{
              border: '2px dashed var(--mint-deep)',
              borderRadius: 24,
              background: 'var(--card)',
              textAlign: 'center',
              padding: '72px 40px',
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
        )}
      </div>

      <div style={{ flex: '1 1 280px', maxWidth: 330, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isLoading ? (
          <>
            <div style={shimmerBlockStyle(180)} />
            <div style={shimmerBlockStyle(250)} />
          </>
        ) : (
          <>
            <PendenciasCard challenges={challenges ?? []} />
            <NotBetBlock />
          </>
        )}
      </div>
    </div>
  );
}
