import { ChallengeCard } from 'bora-frontend';

const participants = [
  { id: '1', user: { id: 'u1', name: 'João Pedro', email: 'joao@ex.com' }, status: 'PAID' },
  { id: '2', user: { id: 'u2', name: 'Marina Alves', email: 'marina@ex.com' }, status: 'PAID' },
  { id: '3', user: { id: 'u3', name: 'Rafa Costa', email: 'rafa@ex.com' }, status: 'JOINED' },
  { id: '4', user: { id: 'u4', name: 'Bia Nunes', email: 'bia@ex.com' }, status: 'INVITED' },
];

export function AguardandoTurma() {
  return (
    <ChallengeCard
      id="c1"
      title="Treino 5x na semana"
      emoji="🏋️"
      durationDays={30}
      collabAmount="50"
      platformFee="10"
      status="WAITING"
      participants={participants}
      onClick={() => {}}
    />
  );
}

export function NoAr() {
  return (
    <ChallengeCard
      id="c2"
      title="Beber 3L de água por dia"
      emoji="💧"
      durationDays={21}
      collabAmount="30"
      platformFee="10"
      status="ACTIVE"
      participants={participants}
      onClick={() => {}}
    />
  );
}

export function Finalizado() {
  return (
    <ChallengeCard
      id="c3"
      title="Correr toda manhã"
      emoji="🏃"
      durationDays={30}
      collabAmount="40"
      platformFee="10"
      status="FINISHED"
      participants={participants.slice(0, 3)}
      onClick={() => {}}
    />
  );
}
