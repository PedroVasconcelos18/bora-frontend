import { PrimaryButton } from 'bora-frontend';

export function Default() {
  return <PrimaryButton onClick={() => {}}>Bora criar o desafio</PrimaryButton>;
}

export function Loading() {
  return <PrimaryButton loading>Enviando…</PrimaryButton>;
}

export function Disabled() {
  return <PrimaryButton disabled>Pagar entrada</PrimaryButton>;
}
