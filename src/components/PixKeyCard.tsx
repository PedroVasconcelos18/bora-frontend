import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { showToast } from './Toast';

interface ProfilePixKeys {
  pixKey: string | null;
  pixKeys: string[];
}

const MAX_PIX_KEYS = 5;

/**
 * PixKeyCard — profile-level editor for the user's saved Pix keys.
 *
 * Feedback: o usuário pode cadastrar até 5 chaves Pix. Cada chave é uma linha
 * empilhada com uma lixeira pra excluir; "adicionar chave" cria uma linha nova
 * (até 5) e "Salvar" persiste a lista inteira via PATCH /profile { pixKeys }.
 *
 * Shares the ['profile'] query key with the pay-flow dropdown (PixPaymentCore)
 * and the winner cash-out prompt so all three dedupe on the same cache entry.
 * D-4: trim-only, no CPF/email/phone format validation.
 */
export function PixKeyCard() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery<ProfilePixKeys>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await apiClient.get('/profile');
      if (!res.ok) throw new Error('profile-error');
      return (await res.json()) as ProfilePixKeys;
    },
  });

  // Local editable copy of the list. Seeded once from the fetched value so a
  // later invalidate-refetch (after saving) never stomps on what the user is
  // currently editing.
  const [keys, setKeys] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated && profile) {
      setKeys(profile.pixKeys ?? []);
      setHydrated(true);
    }
  }, [hydrated, profile]);

  const saveMutation = useMutation({
    mutationFn: async (list: string[]) => {
      const res = await apiClient.patch('/profile', { pixKeys: list });
      if (!res.ok) throw new Error('save-error');
      return (await res.json()) as ProfilePixKeys;
    },
    onSuccess: (data) => {
      showToast('Chaves Pix salvas!');
      // Re-seed local state from the normalized server response (trimmed,
      // deduped, blanks dropped) so the UI reflects exactly what was stored.
      setKeys(data.pixKeys ?? []);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => showToast('Erro ao salvar chaves Pix. Tente novamente.'),
  });

  const updateKey = (index: number, value: string) => {
    setKeys((prev) => prev.map((k, i) => (i === index ? value : k)));
  };

  const removeKey = (index: number) => {
    setKeys((prev) => prev.filter((_, i) => i !== index));
  };

  const addKey = () => {
    setKeys((prev) => (prev.length >= MAX_PIX_KEYS ? prev : [...prev, '']));
  };

  const handleSave = () => {
    // Drop blanks before persisting; server normalizes/dedupes too.
    saveMutation.mutate(keys.map((k) => k.trim()).filter((k) => k.length > 0));
  };

  const canAdd = keys.length < MAX_PIX_KEYS;

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: keys.length > 0 ? 12 : 8,
        }}
      >
        <h3
          style={{
            fontFamily: '"Baloo 2", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: 'var(--ink)',
          }}
        >
          Suas chaves Pix
        </h3>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)' }}>
          {keys.length}/{MAX_PIX_KEYS}
        </span>
      </div>

      {keys.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.4 }}>
          Cadastre suas chaves Pix pra receber prêmios e reembolsos sem correria.
        </p>
      )}

      {/* Chaves empilhadas — cada uma com input + lixeira */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {keys.map((key, index) => (
          <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={key}
              onChange={(e) => updateKey(index, e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              aria-label={`Chave Pix ${index + 1}`}
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
            <button
              type="button"
              onClick={() => removeKey(index)}
              aria-label={`Excluir chave Pix ${index + 1}`}
              title="Excluir"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '9px 11px',
                fontSize: '1rem',
                lineHeight: 1,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={addKey}
          disabled={!canAdd}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: canAdd ? 'var(--green)' : 'var(--muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: canAdd ? 'pointer' : 'not-allowed',
            fontFamily: '"Baloo 2", system-ui, sans-serif',
          }}
        >
          + Adicionar chave
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          style={{
            marginLeft: 'auto',
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
    </div>
  );
}
