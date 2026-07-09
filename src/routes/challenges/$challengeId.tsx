import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
import { StatusPill } from '../../components/StatusPill';
import { PrimaryButton } from '../../components/PrimaryButton';

export const Route = createFileRoute('/challenges/$challengeId')({
  component: ChallengeDetailPage,
});

interface Participant {
  id: string;
  status: string;
  paidAt: string | null;
  user: { id: string; name: string; email: string };
}

interface ChallengeDetail {
  id: string;
  title: string;
  emoji: string;
  durationDays: number;
  collabAmount: string;
  platformFee: string;
  status: string;
  creatorId: string;
  participants: Participant[];
  createdAt: string;
}

function ChallengeDetailPage() {
  const { challengeId } = Route.useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/login' });
    }
  }, [user, navigate]);

  const { data: challenge, isLoading, isError } = useQuery<ChallengeDetail>({
    queryKey: ['challenge', challengeId],
    queryFn: async () => {
      const res = await apiClient.get(`/challenges/${challengeId}`);
      if (!res.ok) throw new Error('challenge-not-found');
      return (await res.json()) as ChallengeDetail;
    },
    enabled: !!user,
    retry: false,
  });

  if (isLoading) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px 26px',
        }}
      >
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
      </section>
    );
  }

  if (isError || !challenge) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px 26px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>😕</div>
        <p style={{ color: 'var(--muted)', fontWeight: 600 }}>Desafio não encontrado.</p>
        <Link to="/home" style={{ color: 'var(--green)', fontWeight: 700, marginTop: 16, textDecoration: 'underline' }}>
          Voltar
        </Link>
      </section>
    );
  }

  const collab = parseFloat(challenge.collabAmount);
  const fee = parseFloat(challenge.platformFee);
  const participantCount = challenge.participants.length;
  // Prize = (participants × collab) - fee; minimum 0
  const prize = Math.max(0, participantCount * collab - fee);
  // D-06: works for both the creator and any invitee who already accepted —
  // both have a Participant row and hit the same "pagar minha entrada" endpoint.
  const myParticipant = user
    ? challenge.participants.find((p) => p.user.id === user.id)
    : undefined;

  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 22px 32px',
        overflowY: 'auto',
      }}
    >
      {/* Back button */}
      <Link
        to="/home"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.92rem',
          marginBottom: 12,
          padding: '4px 0',
          textDecoration: 'none',
        }}
      >
        ← Voltar
      </Link>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 8 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: 'var(--mint)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.8rem',
            flexShrink: 0,
          }}
        >
          {challenge.emoji}
        </div>
        <div>
          <h2
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.5rem',
              lineHeight: 1.1,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {challenge.title}
          </h2>
          <div style={{ marginTop: 4 }}>
            <StatusPill status={challenge.status} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 0 20px' }}>
        <div
          style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '11px 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'var(--ink)',
            }}
          >
            R$ {collab.toFixed(2).replace('.', ',')}
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginTop: 2,
            }}
          >
            Colaboração
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '11px 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'var(--green-ink)',
            }}
          >
            R$ {prize.toFixed(2).replace('.', ',')}
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginTop: 2,
            }}
          >
            Prêmio
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: '11px 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'var(--ink)',
            }}
          >
            {participantCount}
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginTop: 2,
            }}
          >
            Pessoas
          </div>
        </div>
      </div>

      {/* Aguardando turma card — D-11: always shown in Phase 1 */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '1.1rem',
            marginBottom: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ⏳ Status do desafio
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--green-ink)',
            fontWeight: 600,
            padding: '6px 0',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 22,
              height: 22,
              border: '3px solid var(--mint-deep)',
              borderTopColor: 'var(--green)',
              borderRadius: '50%',
              animation: 'sp 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
          <span>Aguardando pagamento dos participantes</span>
        </div>
        {myParticipant && !myParticipant.paidAt && challenge.status === 'WAITING' && (
          <div style={{ marginTop: 12 }}>
            <PrimaryButton
              onClick={() =>
                void navigate({ to: '/participants/pay', search: { challengeId: challenge.id } })
              }
            >
              Pagar minha entrada
            </PrimaryButton>
          </div>
        )}
      </div>

      {/* Participants list */}
      {participantCount > 0 && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: 18,
          }}
        >
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              marginBottom: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            👥 Participantes ({participantCount})
          </div>
          {challenge.participants.map((p) => {
            const initials = p.user.name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase();
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--green)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontFamily: '"Baloo 2", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
                    {p.user.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 600 }}>
                    {p.user.email}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: '#EEE9DD',
                    color: 'var(--muted)',
                  }}
                >
                  Aguardando
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
