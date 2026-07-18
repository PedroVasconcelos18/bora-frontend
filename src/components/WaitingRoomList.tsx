/**
 * WaitingRoomList — the "aguardando turma" nominal list (CHAL-05, D-13).
 *
 * Deliberately shows every participant by name with a data-driven
 * Pagou/Aguardando pill instead of a discreet count — this activates the
 * group's social pressure ("falta só o João"), the real cobrança engine of
 * the closed-friends model. Extracted from the static participants-list
 * block previously inline in challenges/$challengeId.tsx.
 */

export interface WaitingRoomParticipant {
  id?: string;
  name: string;
  paid: boolean;
  /** Só o criador vê "Excluir", e só para aceito-não-pago (item B). */
  removable?: boolean;
}

interface WaitingRoomListProps {
  participants: WaitingRoomParticipant[];
  onRemove?: (id: string) => void;
  busy?: boolean;
}

export function WaitingRoomList({ participants, onRemove, busy }: WaitingRoomListProps) {
  return (
    <div>
      {participants.map((p, idx) => {
        const initials = p.name
          .split(' ')
          .slice(0, 2)
          .map((n) => n[0])
          .join('')
          .toUpperCase();

        return (
          <div
            key={`${p.name}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom: idx < participants.length - 1 ? '1px solid var(--line)' : 'none',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: p.paid ? 'var(--green)' : 'var(--mint-deep)',
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
                {p.name}
              </div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 999,
                background: p.paid ? '#DFF5E6' : '#EEE9DD',
                color: p.paid ? 'var(--green-ink)' : 'var(--muted)',
                flexShrink: 0,
              }}
            >
              {p.paid ? 'Pagou' : 'Aguardando'}
            </span>
            {p.removable && p.id && onRemove && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemove(p.id as string)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 4px',
                  cursor: busy ? 'default' : 'pointer',
                  color: 'var(--coral)',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  opacity: busy ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                Excluir
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
