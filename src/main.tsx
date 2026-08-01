import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import './styles/tokens.css';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Phase 11 (push-lembrete-diario): register the service worker once at boot,
// not inside PushActivationCard (which mounts at up to 3 insertion points and
// would re-register on every mount). The worker only draws push notifications
// and routes taps (bora-frontend/public/sw.js) — it takes no part in fetching
// or caching, so this registration cannot affect asset delivery. The native
// permission prompt is a separate concern (D-05): it fires only from the
// "Ativar" tap handler in PushActivationCard, never here.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
    console.warn('Falha ao registrar o service worker do lembrete de evidência:', err);
  });
}
