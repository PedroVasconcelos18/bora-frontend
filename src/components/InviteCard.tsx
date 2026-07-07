/**
 * InviteCard — displays the challenge info + collaboration amount for an invite.
 * Styled per the card design system from referencia.html.
 */

interface InviteCardProps {
  challengeTitle: string;
  challengeEmoji: string;
  durationDays: number;
  collabAmount: string;
  targetEmail: string;
}

export function InviteCard({
  challengeTitle,
  challengeEmoji,
  durationDays,
  collabAmount,
  targetEmail,
}: InviteCardProps) {
  const collab = parseFloat(collabAmount);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: '18px',
        marginBottom: 16,
      }}
    >
      {/* Hero */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          marginBottom: 16,
        }}
      >
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
          {challengeEmoji}
        </div>
        <div>
          <div
            style={{
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '1.2rem',
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            {challengeTitle}
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--muted)',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {durationDays} dias
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div
        style={{
          background: 'var(--mint)',
          borderRadius: 13,
          padding: '12px 14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--green-ink)', fontWeight: 600 }}>
            Colaboração pra entrar
          </span>
          <strong style={{ fontFamily: '"Baloo 2", system-ui, sans-serif', fontWeight: 800, color: 'var(--green-ink)' }}>
            R$ {collab.toFixed(2).replace('.', ',')}
          </strong>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--green-ink)', fontWeight: 600 }}>
            Convite para
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--green-ink)', fontWeight: 600 }}>
            {targetEmail}
          </span>
        </div>
      </div>
    </div>
  );
}
