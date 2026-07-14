import { FormField } from 'bora-frontend';

export function Default() {
  return (
    <FormField
      id="email"
      label="Email"
      type="email"
      placeholder="voce@email.com"
      autoComplete="email"
      registration={{}}
    />
  );
}

export function ComErro() {
  return (
    <FormField
      id="email-erro"
      label="Email"
      type="email"
      placeholder="voce@email.com"
      error="Email inválido"
      registration={{}}
    />
  );
}

export function Senha() {
  return (
    <FormField
      id="senha"
      label="Senha"
      type="password"
      placeholder="••••••••"
      autoComplete="current-password"
      registration={{}}
    />
  );
}

export function Desabilitado() {
  return (
    <FormField
      id="apelido"
      label="Apelido"
      placeholder="Como a turma te chama"
      disabled
      registration={{ value: 'Pedrão' }}
    />
  );
}
