import { EvidenceUploadCard } from 'bora-frontend';

export function EntradaNaoPaga() {
  return (
    <EvidenceUploadCard
      challengeId="c1"
      isPaid={false}
      todayEvidence={null}
      onUploaded={() => {}}
    />
  );
}

export function AguardandoEnvio() {
  return (
    <EvidenceUploadCard
      challengeId="c1"
      isPaid={true}
      todayEvidence={null}
      onUploaded={() => {}}
    />
  );
}

export function EvidenciaEnviada() {
  return (
    <EvidenceUploadCard
      challengeId="c1"
      isPaid={true}
      todayEvidence={{ objectKey: 'foto-demo.jpg', status: 'PENDING' }}
      onUploaded={() => {}}
    />
  );
}
