import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
  registration: React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>;
  };
}

/**
 * FormField — labeled input following the referencia.html design system.
 * Label: Plus Jakarta Sans 700 14px, margin-bottom 7px
 * Input: padding 14px 16px, border-radius 14px, border 2px solid var(--line)
 * Focus: border-color var(--green-bright), no outline
 */
export function FormField({
  id,
  label,
  type = 'text',
  placeholder,
  autoComplete,
  error,
  disabled,
  registration,
}: FormFieldProps) {
  return (
    <div className="field" style={{ marginBottom: 16 }}>
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
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 14,
          border: `2px solid ${error ? 'var(--coral)' : 'var(--line)'}`,
          background: 'var(--card)',
          fontSize: '1rem',
          fontFamily: 'inherit',
          transition: 'border 0.15s',
          color: 'var(--ink)',
          outline: 'none',
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--green-bright)';
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--line)';
        }}
        {...registration}
      />
      {error && (
        <p
          style={{
            color: 'var(--coral)',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginTop: 5,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
