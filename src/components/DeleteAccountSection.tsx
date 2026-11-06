import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';

const CONFIRM_WORD = 'EXCLUIR';

/**
 * Exclusão de conta (exigência App Store / Google Play). DELETE /auth/account
 * anonimiza a conta no backend e limpa os cookies; aqui só limpamos o estado
 * do cliente, igual ao useLogout.
 */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { clearUser } = useAuthStore();
  const navigate = useNavigate();

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const res = await apiClient.delete('/auth/account').catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      setError('Não deu pra excluir agora. Tenta de novo em instantes.');
      return;
    }
    clearUser();
    queryClient.clear();
    void navigate({ to: '/login' });
  };

  if (!open) {
    return (
      <>
      <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: '0.9rem' }}>
        {/* Static LP pages, not router routes — plain links (Apple: policy reachable in-app). */}
        <a href="/privacidade" style={{ color: 'var(--muted)' }}>Privacidade</a>
        {' · '}
        <a href="/termos" style={{ color: 'var(--muted)' }}>Termos de uso</a>
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          marginTop: 12,
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          fontSize: '0.9rem',
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: 8,
        }}
      >
        Excluir minha conta
      </button>
      </>
    );
  }

  return (
    <section
      aria-labelledby="delete-account-title"
      style={{
        marginTop: 16,
        padding: 18,
        borderRadius: 16,
        background: 'var(--card)',
        border: '2px solid var(--coral)',
        color: 'var(--ink)',
      }}
    >
      <h2
        id="delete-account-title"
        style={{ fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '1.1rem', margin: '0 0 8px' }}
      >
        Excluir minha conta
      </h2>
      <p style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
        Seu nome, e-mail, senha e notificações são apagados e você não consegue mais entrar com esta conta.
      </p>
      <p style={{ margin: '0 0 12px', fontSize: '0.92rem', color: 'var(--muted)' }}>
        Ficam guardados só os registros de pagamento e suas chaves Pix — se você tiver prêmio ou reembolso a
        receber, ele continua sendo enviado. Suas evidências seguem no histórico dos desafios.
      </p>
      <label style={{ display: 'block', fontSize: '0.88rem', marginBottom: 6 }}>
        Digite <strong>{CONFIRM_WORD}</strong> para confirmar
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          style={{
            display: 'block',
            width: '100%',
            marginTop: 6,
            padding: '10px 12px',
            borderRadius: 12,
            border: '2px solid var(--line)',
            background: 'var(--paper)',
            fontSize: '1rem',
            boxSizing: 'border-box',
          }}
        />
      </label>
      {error && (
        <p role="alert" style={{ color: 'var(--coral)', fontSize: '0.88rem', margin: '6px 0' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped('');
            setError(null);
          }}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 14,
            border: '2px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--ink)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={typed.trim() !== CONFIRM_WORD || busy}
          onClick={() => void confirm()}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 14,
            border: 'none',
            background: 'var(--coral)',
            color: 'var(--card)',
            fontWeight: 700,
            cursor: typed.trim() === CONFIRM_WORD && !busy ? 'pointer' : 'not-allowed',
            opacity: typed.trim() === CONFIRM_WORD && !busy ? 1 : 0.5,
          }}
        >
          {busy ? 'Excluindo…' : 'Excluir conta'}
        </button>
      </div>
    </section>
  );
}
