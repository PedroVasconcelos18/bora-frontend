import { useEffect } from 'react';
import { FormField } from './FormField';

interface PixKeyInlineFieldProps {
  id: string;
  label: string;
  /** The Pix keys already registered on the user's profile. */
  savedKeys: string[];
  /** Current field value (the hook prefills this from the primary saved key). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * PixKeyInlineField — the pay-flow Pix key selector.
 *
 * Feedback: na tela de pagamento a pessoa escolhe entre as chaves salvas num
 * dropdown; se não tiver nenhuma cadastrada, ela cria uma ali (input). Nunca
 * mostra opção de "digitar outra" quando já existem chaves salvas.
 */
export function PixKeyInlineField({
  id,
  label,
  savedKeys,
  value,
  onChange,
  placeholder = 'CPF, e-mail, telefone ou chave aleatória',
}: PixKeyInlineFieldProps) {
  const hasKeys = savedKeys.length > 0;

  // Keep the charge value pinned to a real saved key: if the list exists but
  // the current value isn't one of the options (e.g. empty prefill), snap to
  // the first saved key so the dropdown and the charge agree.
  useEffect(() => {
    if (hasKeys && !savedKeys.includes(value)) {
      onChange(savedKeys[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKeys, savedKeys.join('|')]);

  if (!hasKeys) {
    // Sem chaves salvas — a pessoa cria uma aqui (vira a chave de reembolso).
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

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={id}
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
      <select
        id={id}
        value={savedKeys.includes(value) ? value : savedKeys[0]}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 14,
          border: '2px solid var(--line)',
          background: 'var(--card)',
          fontSize: '1rem',
          fontFamily: 'inherit',
          color: 'var(--ink)',
          outline: 'none',
          appearance: 'none',
          cursor: 'pointer',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--green-bright)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--line)';
        }}
      >
        {savedKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );
}
