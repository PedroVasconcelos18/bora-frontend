import { SegmentedTabs } from 'bora-frontend';

export function Default() {
  return (
    <SegmentedTabs>
      {(tab) => (
        <div
          style={{
            padding: 16,
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            color: 'var(--ink)',
          }}
        >
          {tab === 'hoje' && 'Envie sua evidência de hoje 📸'}
          {tab === 'votar' && '3 evidências aguardando seu voto'}
          {tab === 'ranking' && 'Você está em 2º lugar 🔥'}
        </div>
      )}
    </SegmentedTabs>
  );
}
