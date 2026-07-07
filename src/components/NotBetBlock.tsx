/**
 * NotBetBlock — PROF-02 / D-13
 *
 * The ".notbet" block: legal/product positioning that Bora is NOT a gambling
 * app (aposta/bolão). Rendered on the Profile screen above the logout button.
 *
 * Copy is VERBATIM from the UI-SPEC Copywriting Contract and referencia.html.
 * Do NOT modify the text without updating both the UI-SPEC and the allowed-list
 * in test/forbidden-vocab.test.ts.
 */
export function NotBetBlock() {
  return (
    <div
      className="notbet"
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        borderRadius: 14,
        padding: '14px 16px',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      O{' '}
      <strong
        style={{
          color: 'var(--green-bright)',
          fontFamily: '"Baloo 2", system-ui, sans-serif',
        }}
      >
        Bora
      </strong>{' '}
      é uma plataforma de gerenciamento de desafios de hábito entre amigos, feita pra estimular
      comportamentos saudáveis.{' '}
      <strong style={{ color: 'var(--green-bright)' }}>Não é aposta nem bolão</strong>: a
      colaboração funciona como incentivo e volta pra quem mantém o hábito combinado.
    </div>
  );
}
