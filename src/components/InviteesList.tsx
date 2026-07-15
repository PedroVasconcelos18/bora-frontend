import type { CSSProperties } from 'react';
import { CHALLENGE_LIMITS } from '../lib/challenge-limits';

interface InviteesListProps {
  emails: string[];
  onChange: (next: string[]) => void;
  idSuffix?: string;
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: '2px solid var(--line)',
  borderRadius: 14,
  background: 'var(--card)',
  color: 'var(--ink)',
  padding: '13px 15px',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border 0.15s',
};

const removeButtonStyle: CSSProperties = {
  flexShrink: 0,
  width: 40,
  height: 40,
  border: '2px solid var(--line)',
  borderRadius: 14,
  background: 'var(--card)',
  color: 'var(--muted)',
  fontSize: '1.2rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  lineHeight: 1,
  boxSizing: 'border-box',
};

const addButtonStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--green)',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
  padding: '4px 0',
  fontFamily: 'inherit',
};

/**
 * InviteesList — a growable list of individual e-mail inputs (2 → 9),
 * replacing the one-email-per-line textarea. Declared at module scope
 * (own file, mirroring CollabStepper) — an inline component declared
 * inside NewChallengePage would remount every render, making each input
 * lose focus on every keystroke.
 *
 * Each row past the minimum (CHALLENGE_LIMITS.invitees.min = 2) carries a
 * "×" remove button so an accidentally-added slot can be dropped; the first
 * two rows have none, keeping the list from shrinking below the minimum.
 * The parent's derived `emails.join('\n')` string is filtered through
 * parseInvitees before submit/preview, so any blank slots are harmless.
 */
export function InviteesList({ emails, onChange, idSuffix }: InviteesListProps) {
  const canAddMore = emails.length < CHALLENGE_LIMITS.invitees.max;
  const canRemove = emails.length > CHALLENGE_LIMITS.invitees.min;

  return (
    <div>
      {emails.map((email, index) => (
        <div key={index} style={rowStyle}>
          <input
            id={`invitee-${index}${idSuffix ? `-${idSuffix}` : ''}`}
            type="email"
            value={email}
            placeholder={`amigo${index + 1}@email.com`}
            aria-label={`E-mail do convidado ${index + 1}`}
            onChange={(e) => {
              const value = e.currentTarget.value;
              onChange(emails.map((v, i) => (i === index ? value : v)));
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--green-bright)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
            style={inputStyle}
          />
          {canRemove && (
            <button
              type="button"
              aria-label={`Remover convidado ${index + 1}`}
              onClick={() => onChange(emails.filter((_, i) => i !== index))}
              style={removeButtonStyle}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {canAddMore && (
        <button
          type="button"
          aria-label="Adicionar mais um convidado"
          onClick={() => {
            if (emails.length < CHALLENGE_LIMITS.invitees.max) {
              onChange([...emails, '']);
            }
          }}
          style={addButtonStyle}
        >
          Adicionar convidado
        </button>
      )}
    </div>
  );
}
