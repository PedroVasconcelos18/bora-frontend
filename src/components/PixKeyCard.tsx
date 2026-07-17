import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { showToast } from './Toast';

interface ProfilePixKey {
  pixKey: string | null;
}

/**
 * PixKeyCard — D-1/D-3/D-4 profile-level Pix key editor.
 *
 * Read/edit the canonical Pix key stored on the user's profile (safety net
 * for winner payouts and refunds — see quick 260715-i98). Shares the
 * `['profile']` query key with the pay-flow prefill (PixPaymentCore) and the
 * winner cash-out prompt ($challengeId.tsx) so all three dedupe on the same
 * cache entry.
 *
 * D-4: free text, trim-only — no CPF/email/phone/random format validation.
 *
 * Quick 260717-r07 (feedback item 1): once a key is saved, the raw input is
 * replaced by a "registered" list row + Editar button (input clears). This
 * gives explicit "está cadastrada" feedback instead of leaving the typed
 * value sitting in an editable box.
 */
export function PixKeyCard() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery<ProfilePixKey>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await apiClient.get('/profile');
      if (!res.ok) throw new Error('profile-error');
      return (await res.json()) as ProfilePixKey;
    },
  });

  const [pixKey, setPixKey] = useState('');
  // Edit mode: when a key already exists we default to the collapsed
  // "registered" view; the input only appears while adding or editing.
  const [editing, setEditing] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await apiClient.patch('/profile', { pixKey: value });
      if (!res.ok) throw new Error('save-error');
      return (await res.json()) as ProfilePixKey;
    },
    onSuccess: () => {
      showToast('Chave Pix salva!');
      // Collapse back to the registered view and clear the box (item 1).
      setEditing(false);
      setPixKey('');
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      showToast('Erro ao salvar chave Pix. Tente novamente.');
    },
  });

  const savedKey = profile?.pixKey ?? '';
  const hasKey = !!savedKey;
  // Show the input while adding a first key OR while explicitly editing.
  const showInput = !hasKey || editing;

  const startEditing = () => {
    setPixKey(savedKey);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setPixKey('');
  };

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 18,
      }}
    >
      <h3
        style={{
          fontFamily: '"Baloo 2", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.05rem',
          color: 'var(--ink)',
          marginBottom: showInput ? (hasKey ? 12 : 8) : 12,
        }}
      >
        Sua chave Pix
      </h3>

      {!hasKey && !editing && (
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.4 }}>
          Cadastre sua chave Pix pra receber prêmios e reembolsos sem correria.
        </p>
      )}

      {showInput ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            aria-label="Sua chave Pix"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: '0.88rem',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          {hasKey && (
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saveMutation.isPending}
              style={{
                background: 'var(--card)',
                color: 'var(--muted)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '10px 14px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: '"Baloo 2", system-ui, sans-serif',
              }}
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={() => saveMutation.mutate(pixKey)}
            disabled={saveMutation.isPending}
            style={{
              background: 'var(--green-bright)',
              color: 'var(--green-ink)',
              border: 'none',
              borderRadius: 10,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: saveMutation.isPending ? 0.6 : 1,
              whiteSpace: 'nowrap',
              fontFamily: '"Baloo 2", system-ui, sans-serif',
            }}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      ) : (
        // Registered view — the key is shown as a list row, box cleared (item 1).
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
            onClick={startEditing}
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
      )}
    </div>
  );
}
