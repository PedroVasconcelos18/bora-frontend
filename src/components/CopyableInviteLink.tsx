import { useState } from 'react';
import { showToast } from './Toast';

/**
 * CopyableInviteLink — copyable invite link following UI-SPEC.
 * Background: var(--mint), border: 1px solid var(--mint-deep), border-radius 12px
 * Copy button uses ghost button pattern.
 */

interface CopyableInviteLinkProps {
  link: string;
  targetEmail?: string;
}

export function CopyableInviteLink({ link, targetEmail }: CopyableInviteLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      showToast('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without Clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      showToast('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        background: 'var(--mint)',
        border: '1px solid var(--mint-deep)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {targetEmail && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--muted)',
              fontWeight: 600,
              marginBottom: 3,
            }}
          >
            {targetEmail}
          </div>
        )}
        <input
          readOnly
          value={link}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.82rem',
            color: 'var(--green-ink)',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          onClick={(e) => e.currentTarget.select()}
          aria-label={`Link de convite para ${targetEmail ?? 'convidado'}`}
        />
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        style={{
          background: 'var(--card)',
          color: 'var(--ink)',
          border: '2px solid var(--line)',
          borderRadius: 10,
          padding: '6px 10px',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          flexShrink: 0,
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--green-bright)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
      >
        {copied ? '✓ Copiado' : '📋 Copiar link de convite'}
      </button>
    </div>
  );
}
