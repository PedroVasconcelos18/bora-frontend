import { useEffect, useState } from 'react';
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
  const [hydrated, setHydrated] = useState(false);

  // Seed local input state from the fetched value exactly once (per mount),
  // so a subsequent invalidate-refetch (after saving) does not stomp on
  // whatever the user is currently typing.
  useEffect(() => {
    if (!hydrated && profile) {
      setPixKey(profile.pixKey ?? '');
      setHydrated(true);
    }
  }, [hydrated, profile]);

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await apiClient.patch('/profile', { pixKey: value });
      if (!res.ok) throw new Error('save-error');
      return (await res.json()) as ProfilePixKey;
    },
    onSuccess: () => {
      showToast('Chave Pix salva!');
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      showToast('Erro ao salvar chave Pix. Tente novamente.');
    },
  });

  const hasKey = !!profile?.pixKey;

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
          marginBottom: hasKey ? 12 : 8,
        }}
      >
        Sua chave Pix
      </h3>

      {!hasKey && (
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.4 }}>
          Cadastre sua chave Pix pra receber prêmios e reembolsos sem correria.
        </p>
      )}

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
    </div>
  );
}
