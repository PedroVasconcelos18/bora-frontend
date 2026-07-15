import type { CSSProperties } from 'react';
import { CHALLENGE_LIMITS } from '../lib/challenge-limits';

interface InviteesListProps {
  emails: string[];
  onChange: (next: string[]) => void;
  idSuffix?: string;
}

const inputStyle: CSSProperties = {
  width: '100%',
  border: '2px solid var(--line)',
  borderRadius: 14,
  background: 'var(--card)',
  color: 'var(--ink)',
  padding: '13px 15px',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border 0.15s',
  marginBottom: 8,
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
 * No remove button by design (CHALLENGE_LIMITS.invitees.min = 2): the
 * parent's derived `emails.join('\n')` string is filtered through
 * parseInvitees before submit/preview, so blank slots are harmless.
 */
export function InviteesList({ emails, onChange, idSuffix }: InviteesListProps) {
  const canAddMore = emails.length < CHALLENGE_LIMITS.invitees.max;

  return (
    <div>
      {emails.map((email, index) => (
        <input
          key={index}
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
