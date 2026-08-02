import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { apiClient } from '../api/client';
import { PixKeyCard } from '../components/PixKeyCard';
import { NotificationPreferencesSection } from '../components/NotificationPreferencesSection';
import { ChallengeCard } from '../components/ChallengeCard';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../lib/breakpoints';
import { useLogout } from '../hooks/useLogout';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

interface ProfileStats {
  activeChallenges: number;
  validatedDays: number;
}

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
}

function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = useLogout();

  // PROF-01: server-computed stats (D-12) — never client-side aggregation.
  const { data: stats } = useQuery<ProfileStats>({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/profile/stats');
      if (!res.ok) throw new Error('profile-stats-error');
      return (await res.json()) as ProfileStats;
    },
    enabled: !!user,
  });

  // D-17: history reuses the SAME GET /challenges endpoint home.tsx already
  // uses (same query key, no new endpoint) — filtered client-side below to
  // finished/cancelled only. Read-only.
  const { data: challenges } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await apiClient.get('/challenges');
      if (!res.ok) return [];
      return (await res.json()) as Challenge[];
    },
    enabled: !!user,
  });

  // Computed unconditionally (before any early return) so the rules of
  // hooks stay satisfied regardless of which branch is taken (D-02/D-22).
  const isWeb = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  if (!user) return null;

  const activeCount = stats?.activeChallenges ?? 0;
  const validatedDays = stats?.validatedDays ?? 0;

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

      {/* T-i98 D-1/D-3: profile-level Pix key editor (mobile) */}
      <div style={{ marginBottom: 16 }}>
        <PixKeyCard />
      </div>

      {/* Phase 12 D12-08: per-type push preferences (mobile) */}
      <div style={{ marginBottom: 16 }}>
        <NotificationPreferencesSection />
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

  // --- Web layout (>=768px, FUN-09) ----------------------------------------
  // D-17/D-18: read-only — no edit/change-password/member-since. Left column
  // reuses the same avatar/name/email + stats + NotBetBlock + logout; right
  // column adds a challenge-history grid via GET /challenges (filtered).
  const finishedChallenges = (challenges ?? []).filter(
    (c) => c.status !== 'WAITING' && c.status !== 'ACTIVE'
  );

  const infoCardStyle = {
    background: 'var(--card)',
    border: '1px solid var(--line)',
    borderRadius: 20,
    padding: 22,
  } as const;

  return (
    <div>
      <h1
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontSize: '1.9rem',
          fontWeight: 800,
          lineHeight: 1.1,
          color: 'var(--ink)',
          marginBottom: 20,
        }}
      >
        Perfil
      </h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, alignItems: 'flex-start' }}>
        {/* LEFT column — profile data + stats + NotBetBlock + logout */}
        <div
          style={{
            flex: '1 1 340px',
            minWidth: 300,
            maxWidth: 460,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={infoCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              {/* Avatar — same visual language as mobile */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--green-bright)',
                  color: 'var(--green-ink)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: '"Baloo 2", system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  flexShrink: 0,
                }}
              >
                {user.name[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: '"Baloo 2", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    color: 'var(--ink)',
                  }}
                >
                  {user.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{user.email}</div>
              </div>
            </div>

            {/* Stat tiles — reflowed side by side, same data as mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                style={{
                  background: 'var(--paper)',
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
                  background: 'var(--paper)',
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
          </div>

          {/* T-i98 D-1/D-3: profile-level Pix key editor (web) */}
          <PixKeyCard />

          {/* Phase 12 D12-08: per-type push preferences (web) */}
          <NotificationPreferencesSection />

          {/* Ghost "Sair da conta" button — SAME handler + hover as mobile (D-19) */}
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
        </div>

        {/* RIGHT column — challenge history (D-17, read-only) */}
        <div style={{ flex: '2 1 480px', minWidth: 320 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              margin: '0 2px 12px',
            }}
          >
            <h2
              style={{
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            >
              Histórico de desafios
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600 }}>
              {finishedChallenges.length} encerrados
            </span>
          </div>

          {finishedChallenges.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              {finishedChallenges.map((challenge) => (
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
          ) : (
            <div
              style={{
                border: '2px dashed var(--mint-deep)',
                borderRadius: 20,
                background: 'var(--card)',
                textAlign: 'center',
                padding: '32px 24px',
                color: 'var(--muted)',
                fontSize: '0.9rem',
              }}
            >
              Nenhum desafio encerrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
