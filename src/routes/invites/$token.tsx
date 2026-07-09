import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
import { InviteCard } from '../../components/InviteCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { DisclaimerFooter } from '../../components/DisclaimerFooter';
import { savePendingInvite } from '../../lib/pendingInvite';

export const Route = createFileRoute('/invites/$token')({
  component: InvitePage,
});

interface InvitePreview {
  targetEmail: string;
  challenge: {
    id: string;
    title: string;
    emoji: string;
    durationDays: number;
    collabAmount: string;
    platformFee: string;
    status: string;
  };
}

function InvitePage() {
  const { token } = Route.useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Pitfall 4: Before redirecting to /signup or /login, save token in sessionStorage
  // so the auth redirect doesn't lose the invite context.
  const saveTokenAndNavigate = (to: '/signup' | '/login') => {
    savePendingInvite(token);
    void navigate({ to });
  };

  // Fetch invite preview — public, no auth required
  const {
    data: invite,
    isLoading,
    isError,
  } = useQuery<InvitePreview>({
    queryKey: ['invite', token],
    queryFn: async () => {
      const res = await apiClient.get(`/invites/${token}`);
      if (!res.ok) {
        throw new Error('not-found');
      }
      return (await res.json()) as InvitePreview;
    },
    retry: false,
  });

  // "Aceitar e pagar" (D-06) navigates straight to the pay screen with the
  // invite token — the pay screen fires POST /invites/:token/accept-and-pay
  // on mount, so accept + charge happen as one flow from the invitee's POV.
  const goToPay = () => {
    void navigate({ to: '/participants/pay', search: { token } });
  };

  // Loading state
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

  // State: invalid/expired token
  if (isError || !invite) {
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
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>😕</div>
        <h2
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '1.4rem',
            color: 'var(--ink)',
            marginBottom: 8,
          }}
        >
          Convite inválido ou expirado.
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: 24 }}>
          Este link de convite não é mais válido. Peça um novo convite ao organizador do desafio.
        </p>
        <Link
          to="/login"
          style={{
            color: 'var(--green)',
            fontWeight: 700,
            fontSize: '0.92rem',
            textDecoration: 'underline',
          }}
        >
          Voltar ao login
        </Link>
      </section>
    );
  }

  // State: wrong-email (logged in as wrong user)
  const isWrongEmail =
    user && user.email.toLowerCase() !== invite.targetEmail.toLowerCase();

  if (isWrongEmail) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 26px',
        }}
      >
        <InviteCard
          challengeTitle={invite.challenge.title}
          challengeEmoji={invite.challenge.emoji}
          durationDays={invite.challenge.durationDays}
          collabAmount={invite.challenge.collabAmount}
          targetEmail={invite.targetEmail}
        />
        <div
          style={{
            background: '#FFE2DA',
            border: '1px solid #FFD2C7',
            borderRadius: 14,
            padding: '14px 16px',
            marginTop: 8,
          }}
        >
          <p style={{ color: 'var(--coral)', fontWeight: 700, fontSize: '0.92rem', margin: 0 }}>
            Este convite é para {invite.targetEmail}. Você está logado como {user.email}. Entre com a conta correta para aceitar.
          </p>
        </div>
      </section>
    );
  }

  // State: valid + not logged in → show InviteCard + CTA "Criar conta para aceitar"
  if (!user) {
    return (
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 26px',
        }}
      >
        <h2
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '1.3rem',
            color: 'var(--ink)',
            marginBottom: 16,
          }}
        >
          Você foi convidado!
        </h2>
        <InviteCard
          challengeTitle={invite.challenge.title}
          challengeEmoji={invite.challenge.emoji}
          durationDays={invite.challenge.durationDays}
          collabAmount={invite.challenge.collabAmount}
          targetEmail={invite.targetEmail}
        />
        <div style={{ marginBottom: 12 }}>
          <PrimaryButton
            onClick={() => saveTokenAndNavigate('/signup')}
          >
            Criar conta para aceitar
          </PrimaryButton>
        </div>
        <button
          onClick={() => saveTokenAndNavigate('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--green)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '8px 0',
          }}
        >
          Já tenho conta — entrar
        </button>
        {/* "Não é aposta" disclaimer footer (PROF-02 / D-13) */}
        <DisclaimerFooter />
      </section>
    );
  }

  // State: valid + logged in as matching email → show InviteCard + CTA "Aceitar e pagar"
  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 26px',
      }}
    >
      <h2
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: '1.3rem',
          color: 'var(--ink)',
          marginBottom: 16,
        }}
      >
        Você foi convidado!
      </h2>
      <InviteCard
        challengeTitle={invite.challenge.title}
        challengeEmoji={invite.challenge.emoji}
        durationDays={invite.challenge.durationDays}
        collabAmount={invite.challenge.collabAmount}
        targetEmail={invite.targetEmail}
      />
      <div style={{ marginTop: 8 }}>
        <PrimaryButton onClick={goToPay}>Aceitar e pagar</PrimaryButton>
      </div>
      {/* "Não é aposta" disclaimer footer (PROF-02 / D-13) */}
      <DisclaimerFooter />
    </section>
  );
}
