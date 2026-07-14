import { EvidenceStatusBadge } from 'bora-frontend';

export function Sent() {
  return <EvidenceStatusBadge status="SENT" />;
}

export function Accepted() {
  return <EvidenceStatusBadge status="ACCEPTED" />;
}

export function Rejected() {
  return <EvidenceStatusBadge status="REJECTED" />;
}
