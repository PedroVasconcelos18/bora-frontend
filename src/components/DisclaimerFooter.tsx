/**
 * DisclaimerFooter — PROF-02 / D-13
 *
 * Persistent global footer with the "não é aposta" short framing.
 * Mount ONLY on the auth screens (login, signup) and the invite accept screen.
 * Do NOT mount on the creation flow (/challenges/new) — D-13 keeps those clean.
 *
 * This is the shorter footer variant (one-liner framing).
 * The full .notbet block lives in NotBetBlock.tsx for the Profile screen.
 */
export function DisclaimerFooter() {
  return (
    <div
      style={{
        marginTop: 24,
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
