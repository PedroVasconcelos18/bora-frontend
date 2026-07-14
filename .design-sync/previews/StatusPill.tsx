import { StatusPill } from 'bora-frontend';

export function Waiting() {
  return <StatusPill status="WAITING" />;
}

export function Active() {
  return <StatusPill status="ACTIVE" />;
}

export function Finished() {
  return <StatusPill status="FINISHED" />;
}

export function Cancelled() {
  return <StatusPill status="CANCELLED" />;
}

export function Invited() {
  return <StatusPill status="INVITED" />;
}
