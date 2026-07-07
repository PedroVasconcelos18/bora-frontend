/**
 * StatusPill — maps ChallengeStatus enum values to UI-SPEC color classes.
 *
 * All 5 states rendered per CHAL-04:
 * - WAITING  → "aguardando turma"   → gray
 * - ACTIVE   → "no ar"              → mint/green (Phase 2+, shown but not reachable)
 * - FINISHED → "finalizado"         → mint-deep (Phase 4+)
 * - CANCELLED→ "cancelado"          → coral
 * - INVITED  → "convite" (invite)   → amber (for invite-status pills)
 */

type PillStatus = 'WAITING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED' | 'INVITED';

interface StatusPillProps {
  status: PillStatus | string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  WAITING: { label: 'Aguardando turma', bg: '#EEE9DD', color: 'var(--muted)' },
  ACTIVE: { label: 'No ar', bg: 'var(--mint)', color: 'var(--green-ink)' },
  FINISHED: { label: 'Finalizado', bg: 'var(--mint-deep)', color: 'var(--muted)' },
  CANCELLED: { label: 'Cancelado', bg: '#FFE2DA', color: 'var(--coral)' },
  INVITED: { label: 'Convite', bg: '#FFF3D4', color: '#9a7400' },
};

export function StatusPill({ status }: StatusPillProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG['WAITING'];

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
