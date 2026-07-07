import React from 'react';

interface PrimaryButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * PrimaryButton — CTA button following the referencia.html .btn-primary design.
 * Font: Baloo 2 700 16px
 * Background: var(--green-bright), 3D shadow 0 7px 0 -1px #1aa652
 * Disabled: var(--mint-deep) background
 */
export function PrimaryButton({
  children,
  type = 'button',
  loading = false,
  disabled = false,
  onClick,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5em',
        fontFamily: '"Baloo 2", system-ui, sans-serif',
        fontWeight: 700,
        fontSize: '1rem',
        padding: '14px 22px',
        borderRadius: 16,
        border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'transform 0.14s, box-shadow 0.14s, background 0.14s',
        width: '100%',
        background: isDisabled ? 'var(--mint-deep)' : 'var(--green-bright)',
        color: isDisabled ? '#6f8a78' : 'var(--green-ink)',
        boxShadow: isDisabled
          ? '0 7px 0 -1px #9ccfb0'
          : '0 7px 0 -1px #1aa652',
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 9px 0 -1px #1aa652';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 7px 0 -1px #1aa652';
        }
      }}
      onMouseDown={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(3px)';
          e.currentTarget.style.boxShadow = '0 4px 0 -1px #1aa652';
        }
      }}
      onMouseUp={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 9px 0 -1px #1aa652';
        }
      }}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 22,
        height: 22,
        border: '3px solid var(--mint-deep)',
        borderTopColor: 'var(--green)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}
