import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

type HealthResponse = {
  status: string;
  db: boolean;
};

function IndexPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HealthResponse>;
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setLoading(false);
      });
  }, []);

  return (
    <main style={{ padding: '32px 24px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div
          style={{
            width: 74,
            height: 74,
            borderRadius: 24,
            background: 'var(--green-bright)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 14px',
            transform: 'rotate(-7deg)',
            fontSize: '2.4rem',
            boxShadow: 'var(--shadow)',
          }}
        >
          🏃
        </div>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, color: 'var(--green-ink)' }}>Bora</h1>
        <p style={{ color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
          mantenha o hábito com a turma
        </p>
      </div>

      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          padding: '20px 16px',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Status da API</h2>
        {loading && <p style={{ color: 'var(--muted)' }}>Verificando...</p>}
        {error && (
          <p style={{ color: 'var(--coral)', fontWeight: 600 }}>
            Erro: {error}
          </p>
        )}
        {health && (
          <div>
            <p style={{ color: 'var(--green)', fontWeight: 700 }}>
              ✓ API: {health.status}
            </p>
            <p style={{ color: 'var(--green)', fontWeight: 700 }}>
              ✓ DB: {health.db ? 'conectado' : 'desconectado'}
            </p>
          </div>
        )}
      </div>

      {/* "Não é aposta" framing — legal disclaimer (PROF-02 / D-13) */}
      <div
        className="notbet"
        style={{
          marginTop: 24,
          background: 'var(--mint)',
          borderRadius: 14,
          padding: '14px 16px',
          fontSize: '0.86rem',
          color: 'var(--green-ink)',
        }}
      >
        <strong style={{ fontFamily: '"Baloo 2"' }}>Bora não é aposta.</strong> É um compromisso
        de hábito entre amigos. A colaboração vai para quem mais mantiver o hábito — não para
        quem acertar um palpite.
      </div>
    </main>
  );
}
