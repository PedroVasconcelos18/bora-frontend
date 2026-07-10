/**
 * EvidenceStatusBadge — evidence-outcome badge, same visual recipe as
 * StatusPill but a distinct component/prop set scoped to evidence state
 * (SENT / ACCEPTED / REJECTED). Deliberately NOT merged into StatusPill's
 * PillStatus union — challenge-lifecycle pills and evidence-outcome badges
 * are kept as separate concerns per UI-SPEC.
 */

export type EvidenceStatus = 'SENT' | 'ACCEPTED' | 'REJECTED';

interface EvidenceStatusBadgeProps {
  status: EvidenceStatus;
}

const EVIDENCE_STATUS_CONFIG: Record<
  EvidenceStatus,
  { label: string; bg: string; color: string }
> = {
  SENT: { label: 'Em votação', bg: '#EEE9DD', color: 'var(--muted)' },
  ACCEPTED: { label: 'Aceita', bg: 'var(--mint)', color: 'var(--green-ink)' },
  REJECTED: { label: 'Rejeitada', bg: '#FFE2DA', color: 'var(--coral)' },
};

export function EvidenceStatusBadge({ status }: EvidenceStatusBadgeProps) {
  const config = EVIDENCE_STATUS_CONFIG[status];

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: '"Baloo 2", system-ui, sans-serif',
        fontWeight: 700,
        fontSize: '0.7rem',
        padding: '5px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        background: config.bg,
        color: config.color,
        flexShrink: 0,
      }}
    >
      {config.label}
    </span>
  );
}
