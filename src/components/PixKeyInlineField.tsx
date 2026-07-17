import { useState } from 'react';
import { FormField } from './FormField';

interface PixKeyInlineFieldProps {
  id: string;
  label: string;
  /** The Pix key already registered on the user's profile, if any. */
  savedKey?: string | null;
  /** Current field value (the hook prefills this from the profile key). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * PixKeyInlineField — the pay-flow counterpart to the profile PixKeyCard
 * (quick 260717-r07, feedback item 4b).
 *
 * When the user already has a Pix key registered on their profile, this shows
 * it as a "registered" list row with an Editar button — the same logic as the
 * profile — instead of a raw, pre-filled input the user has to guess is
 * editable. Editar reveals the input (seeded from the saved value via the
 * hook's prefill). With no saved key, it degrades to a plain labeled input so
 * the reembolso key can still be typed.
 */
export function PixKeyInlineField({
  id,
  label,
  savedKey,
  value,
  onChange,
  placeholder = 'CPF, e-mail, telefone ou chave aleatória',
}: PixKeyInlineFieldProps) {
  const hasKey = !!(savedKey && savedKey.trim());
  const [editing, setEditing] = useState(false);

  if (hasKey && !editing) {
    return (
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
          {label}
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--mint)',
              color: 'var(--green-ink)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            ✓
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: 'var(--green-ink)',
              }}
            >
              Chave cadastrada
            </div>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {savedKey}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--green)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: '"Baloo 2", system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            Editar
          </button>
        </div>
      </div>
    );
  }

  return (
    <FormField
      id={id}
      label={label}
      placeholder={placeholder}
      registration={{
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      }}
    />
  );
}
