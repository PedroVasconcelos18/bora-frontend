import { VoteCard } from 'bora-frontend';

export function Aberta() {
  return (
    <VoteCard
      evidence={{
        id: 'e1',
        authorName: 'Marina Alves',
        objectKey: 'evidencia-demo.jpg',
        windowClosesAt: '2026-07-11T09:00:00Z',
        status: 'PENDING',
        hasVoted: false,
      }}
      isVoting={false}
      onVote={() => {}}
    />
  );
}

export function JaVotou() {
  return (
    <VoteCard
      evidence={{
        id: 'e2',
        authorName: 'João Pedro',
        objectKey: 'evidencia-demo.jpg',
        windowClosesAt: '2026-07-11T09:00:00Z',
        status: 'PENDING',
        hasVoted: true,
      }}
      isVoting={false}
      onVote={() => {}}
    />
  );
}

export function Resolvida() {
  return (
    <VoteCard
      evidence={{
        id: 'e3',
        authorName: 'Rafa Costa',
        objectKey: 'evidencia-demo.jpg',
        windowClosesAt: '2026-07-11T09:00:00Z',
        status: 'ACCEPTED',
        hasVoted: true,
      }}
      isVoting={false}
      onVote={() => {}}
    />
  );
}
