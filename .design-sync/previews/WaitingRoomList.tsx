import { WaitingRoomList } from 'bora-frontend';

export function MostlyPaid() {
  return (
    <WaitingRoomList
      participants={[
        { name: 'Marina Alves', paid: true },
        { name: 'Rafa Costa', paid: true },
        { name: 'Bia Nunes', paid: true },
        { name: 'João Pedro', paid: false },
      ]}
    />
  );
}

export function TodosPagaram() {
  return (
    <WaitingRoomList
      participants={[
        { name: 'Marina Alves', paid: true },
        { name: 'Rafa Costa', paid: true },
        { name: 'Bia Nunes', paid: true },
        { name: 'João Pedro', paid: true },
      ]}
    />
  );
}
