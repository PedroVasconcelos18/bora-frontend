import { createFileRoute, redirect } from '@tanstack/react-router';

// A raiz `/` é servida pela landing page estática (ver vercel.json + scripts/postbuild.mjs).
// Este route existe apenas como defesa para navegação client-side dentro da SPA:
// se algo dentro do app navegar para `/`, redirecionamos ao dashboard em `/home`.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/home' });
  },
});
