import { StatusPill } from './StatusPill';

/**
 * ChallengeCard — challenge list card following referencia.html .ccard.
 * Background: var(--card), border-radius 20px, padding 16px
 * Hover: translateY(-3px), shadow var(--shadow-sm)
 * Emoji tile: 46×46, border-radius 14px, background var(--mint)
 */

interface Participant {
  id: string;
  user: { id: string; name: string; email: string };
  status: string;
}

interface ChallengeCardProps {
  id: string;
  title: string;
  emoji: string;
  durationDays: number;
  collabAmount: string;
  platformFee: string;
  status: string;
  participants?: Participant[];
  onClick?: () => void;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const AVATAR_COLORS = ['#2BD86B', '#FF6B4A', '#7C5CFF', '#FFB020', '#12B85C'];

export function ChallengeCard({
  title,
  emoji,
  durationDays,
  collabAmount,
  platformFee,
  status,
  participants = [],
  onClick,
}: ChallengeCardProps) {
  const collab = parseFloat(collabAmount);
  const fee = parseFloat(platformFee);
  const participantCount = participants.length;
  const estimatedPrize = Math.max(0, participantCount * collab - fee);

  const metaText =
    status === 'WAITING'
      ? `Aguardando · ${durationDays} dias · ${participantCount} pessoa${participantCount !== 1 ? 's' : ''}`
      : `${durationDays} dias · ${participantCount} pessoa${participantCount !== 1 ? 's' : ''}`;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: 16,
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        textAlign: 'left',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '3px solid var(--coral)';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      {/* Top: emoji + title + pill */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Emoji tile */}
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'var(--mint)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.5rem',
            flexShrink: 0,
          }}
        >
          {emoji}
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '1.12rem',
              lineHeight: 1.15,
              color: 'var(--ink)',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--muted)',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {metaText}
          </div>
        </div>

        <StatusPill status={status} />
      </div>

      {/* Footer: avatars + prize */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
        }}
      >
        {/* Avatar stack */}
        <div style={{ display: 'flex' }}>
          {participants.slice(0, 5).map((p, i) => (
            <span
              key={p.id}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '2px solid var(--card)',
                marginLeft: i === 0 ? 0 : -8,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontFamily: '"Baloo 2", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '0.72rem',
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                zIndex: 5 - i,
                position: 'relative',
              }}
            >
              {p.user.name[0].toUpperCase()}
            </span>
          ))}
        </div>

        {/* Prize */}
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              display: 'block',
              fontSize: '0.66rem',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Prêmio
          </span>
          <span
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              color: 'var(--green-ink)',
              fontSize: '1rem',
            }}
          >
            {formatBRL(estimatedPrize)}
          </span>
        </div>
      </div>
    </button>
  );
}
