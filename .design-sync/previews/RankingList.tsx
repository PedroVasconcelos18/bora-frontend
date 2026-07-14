import { RankingList } from 'bora-frontend';

export function LiderUnico() {
  return (
    <RankingList
      ranking={{
        prize: '190.00',
        leaders: ['Marina Alves'],
        participants: [
          {
            id: '1',
            name: 'Marina Alves',
            validatedDays: 12,
            durationDays: 30,
            progress: 0.4,
            isLeader: true,
            streak: ['cumprido', 'cumprido', 'cumprido', 'hoje', 'futuro', 'futuro'],
          },
          {
            id: '2',
            name: 'João Pedro',
            validatedDays: 10,
            durationDays: 30,
            progress: 0.33,
            isLeader: false,
            streak: ['cumprido', 'falhou', 'cumprido', 'hoje', 'futuro', 'futuro'],
          },
          {
            id: '3',
            name: 'Rafa Costa',
            validatedDays: 8,
            durationDays: 30,
            progress: 0.27,
            isLeader: false,
            streak: ['cumprido', 'falhou', 'falhou', 'hoje', 'futuro', 'futuro'],
          },
        ],
      }}
    />
  );
}

export function Empate() {
  return (
    <RankingList
      ranking={{
        prize: '240.00',
        leaders: ['Marina Alves', 'Bia Nunes'],
        participants: [
          {
            id: '1',
            name: 'Marina Alves',
            validatedDays: 14,
            durationDays: 21,
            progress: 0.67,
            isLeader: true,
            streak: ['cumprido', 'cumprido', 'cumprido', 'cumprido', 'hoje', 'futuro'],
          },
          {
            id: '2',
            name: 'Bia Nunes',
            validatedDays: 14,
            durationDays: 21,
            progress: 0.67,
            isLeader: true,
            streak: ['cumprido', 'cumprido', 'cumprido', 'cumprido', 'hoje', 'futuro'],
          },
          {
            id: '3',
            name: 'Rafa Costa',
            validatedDays: 11,
            durationDays: 21,
            progress: 0.52,
            isLeader: false,
            streak: ['cumprido', 'falhou', 'cumprido', 'cumprido', 'hoje', 'futuro'],
          },
        ],
      }}
    />
  );
}
