import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
import { EmojiPicker } from '../../components/EmojiPicker';
import { PrizeCalculator } from '../../components/PrizeCalculator';
import { PrimaryButton } from '../../components/PrimaryButton';
import { CopyableInviteLink } from '../../components/CopyableInviteLink';
import { showToast } from '../../components/Toast';

export const Route = createFileRoute('/challenges/new')({
  component: NewChallengePage,
});

interface ChallengeFormData {
  title: string;
  durationDays: number;
  collabAmount: number;
  inviteesText: string;
}

interface InviteLink {
  token: string;
  targetEmail: string;
  copyableLink: string;
}

interface CreateChallengeResponse {
  id: string;
  title: string;
  emoji: string;
  status: string;
  copyableLinks: InviteLink[];
}

function NewChallengePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedEmoji, setSelectedEmoji] = useState('🏋️');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyableLinks, setCopyableLinks] = useState<InviteLink[]>([]);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);

  const { register, handleSubmit, watch } = useForm<ChallengeFormData>({
    defaultValues: {
      title: '',
      durationDays: 14,
      collabAmount: 50,
      inviteesText: '',
    },
  });

  // Watch for live prize calculator updates
  const inviteesText = watch('inviteesText');
  const collabAmount = watch('collabAmount');

  if (!user) {
    void navigate({ to: '/login' });
    return null;
  }

  const onSubmit = async (data: ChallengeFormData) => {
    // Frontend validation — same rules as backend, shown as toasts (verbatim from Copywriting Contract)
    if (!data.title.trim()) {
      showToast('Dá um nome pro desafio 🙂');
      return;
    }
    if (Number(data.durationDays) < 3) {
      showToast('A duração mínima é de 3 dias.');
      return;
    }
    if (Number(data.collabAmount) < 5) {
      showToast('A colaboração mínima é R$ 5.');
      return;
    }

    const invitees = data.inviteesText
      .split('\n')
      .map((e) => e.trim())
      .filter(Boolean);
    if (invitees.length < 2) {
      showToast('Convide pelo menos 2 amigos (mínimo de 3 pessoas).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/challenges', {
        title: data.title.trim(),
        emoji: selectedEmoji,
        durationDays: Number(data.durationDays),
        collabAmount: Number(data.collabAmount),
        invitees,
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string | string[] };
        const msg = Array.isArray(err.message)
          ? err.message[0]
          : (err.message ?? 'Erro ao criar desafio.');
        showToast(String(msg));
        return;
      }

      const body = (await res.json()) as CreateChallengeResponse;
      showToast('Desafio criado! Convites enviados ✉️');
      setCopyableLinks(body.copyableLinks ?? []);
      setCreatedChallengeId(body.id);
    } catch {
      showToast('Erro ao criar desafio. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // After creation — show copyable links and navigate CTA
  if (createdChallengeId) {
    return (
      <main style={{ padding: '20px 18px 96px', flex: 1 }}>
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontSize: '1.55rem',
              fontWeight: 800,
              color: 'var(--ink)',
              marginBottom: 6,
            }}
          >
            Desafio criado! 🎉
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
            Convites enviados por e-mail. Copie os links para compartilhar no WhatsApp também.
          </p>
        </div>

        {copyableLinks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                marginBottom: 10,
                color: 'var(--ink)',
              }}
            >
              Links de convite:
            </p>
            {copyableLinks.map((link) => (
              <CopyableInviteLink
                key={link.token}
                link={link.copyableLink}
                targetEmail={link.targetEmail}
              />
            ))}
          </div>
        )}

        <PrimaryButton
          onClick={() => void navigate({ to: '/home' })}
        >
          Ver meus desafios
        </PrimaryButton>
      </main>
    );
  }

  return (
    <main style={{ padding: '20px 18px 96px', flex: 1 }}>
      {/* Section heading */}
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontSize: '1.55rem',
            fontWeight: 800,
            color: 'var(--ink)',
          }}
        >
          Criar desafio
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
          Combine a meta e chame a turma
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        {/* Emoji picker */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: 7,
              color: 'var(--ink)',
            }}
          >
            Ícone do desafio
          </label>
          <EmojiPicker value={selectedEmoji} onChange={setSelectedEmoji} />
        </div>

        {/* Tema */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="title"
            style={{
              display: 'block',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: 7,
              color: 'var(--ink)',
            }}
          >
            Tema do hábito
          </label>
          <input
            id="title"
            type="text"
            placeholder="Ex.: Quem vai mais à academia"
            {...register('title')}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              border: '2px solid var(--line)',
              background: 'var(--card)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              transition: 'border 0.15s',
              color: 'var(--ink)',
              outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--green-bright)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          />
        </div>

        {/* Duração */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="durationDays"
            style={{
              display: 'block',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: 7,
              color: 'var(--ink)',
            }}
          >
            Duração (dias)
          </label>
          <input
            id="durationDays"
            type="number"
            min={3}
            max={90}
            {...register('durationDays', { valueAsNumber: true })}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              border: '2px solid var(--line)',
              background: 'var(--card)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              transition: 'border 0.15s',
              color: 'var(--ink)',
              outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--green-bright)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          />
        </div>

        {/* Colaboração */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="collabAmount"
            style={{
              display: 'block',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: 7,
              color: 'var(--ink)',
            }}
          >
            Colaboração por pessoa (R$, via Pix)
          </label>
          <input
            id="collabAmount"
            type="number"
            min={5}
            step={5}
            {...register('collabAmount', { valueAsNumber: true })}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              border: '2px solid var(--line)',
              background: 'var(--card)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              transition: 'border 0.15s',
              color: 'var(--ink)',
              outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--green-bright)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          />
        </div>

        {/* Convidar amigos */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="inviteesText"
            style={{
              display: 'block',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: 7,
              color: 'var(--ink)',
            }}
          >
            Convidar amigos (e-mails, um por linha)
          </label>
          <textarea
            id="inviteesText"
            placeholder={'amigo1@email.com\namigo2@email.com'}
            {...register('inviteesText')}
            style={{
              width: '100%',
              padding: '13px 15px',
              borderRadius: 14,
              border: '2px solid var(--line)',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              resize: 'vertical',
              minHeight: 74,
              background: 'var(--card)',
              color: 'var(--ink)',
              outline: 'none',
              transition: 'border 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--green-bright)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          />
        </div>

        {/* Live prize calculator (fires on every input — pure client math D-12) */}
        <PrizeCalculator
          emailsText={inviteesText}
          collabAmount={Number(collabAmount) || 0}
        />

        {/* CTA — verbatim from Copywriting Contract */}
        <PrimaryButton type="submit" loading={isSubmitting}>
          Criar desafio · taxa R$ 10 via Pix
        </PrimaryButton>
      </form>
    </main>
  );
}
