import { InviteCard } from 'bora-frontend';

export function Treino() {
  return (
    <InviteCard
      challengeTitle="Treino 5x na semana"
      challengeEmoji="🏋️"
      durationDays={30}
      collabAmount="50"
      targetEmail="joao@email.com"
    />
  );
}

export function Agua() {
  return (
    <InviteCard
      challengeTitle="Beber 3L de água por dia"
      challengeEmoji="💧"
      durationDays={21}
      collabAmount="30"
      targetEmail="marina@email.com"
    />
  );
}
