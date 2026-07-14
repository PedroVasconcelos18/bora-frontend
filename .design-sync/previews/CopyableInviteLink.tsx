import { CopyableInviteLink } from 'bora-frontend';

export function ComEmail() {
  return (
    <CopyableInviteLink
      link="https://bora.app/convite/aX9k2"
      targetEmail="marina@email.com"
    />
  );
}

export function SemEmail() {
  return <CopyableInviteLink link="https://bora.app/convite/7Qm4z" />;
}
