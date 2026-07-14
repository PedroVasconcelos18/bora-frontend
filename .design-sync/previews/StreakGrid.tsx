import { StreakGrid } from 'bora-frontend';

export function EmAndamento() {
  return <StreakGrid streak={['cumprido', 'cumprido', 'falhou', 'cumprido', 'hoje', 'futuro', 'futuro']} />;
}

export function SequenciaPerfeita() {
  return <StreakGrid streak={['cumprido', 'cumprido', 'cumprido', 'cumprido', 'cumprido', 'cumprido', 'hoje']} />;
}

export function ComPendencia() {
  return <StreakGrid streak={['cumprido', 'falhou', 'pending', 'cumprido', 'falhou', 'hoje', 'futuro']} />;
}
