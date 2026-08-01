// bora-frontend/public/sw.js
//
// Phase 11 (push-lembrete-diario) — the browser half of the daily evidence
// reminder delivery path. This worker's entire job is to draw ONE
// notification from an inbound push and route ONE tap. Nothing else.
//
// Payload contract produced by the backend sender (bora-backend/src/push):
//   { title: string, body: string, url: string, tag: string }
//
// Three hard prohibitions, each load-bearing:
//
// 1. No request-interception ('fetch') handler. This project already shipped
//    a stale bundle to production once (project memory: a `npm run build`
//    that clobbered the dev server masked a stale-deploy incident). A worker
//    that answers network requests would make that kind of incident
//    permanent and invisible instead of a one-off.
// 2. No use of the Cache Storage API and no precaching of anything.
// 3. No import of application code — this file is standalone, plain
//    JavaScript that runs in the worker global scope and is never processed
//    by Vite.

self.addEventListener('install', () => {
  // Take over immediately instead of waiting for every open tab to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Malformed or payload-less push — draw nothing rather than throw.
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag,
      data: { url: data.url },
      // No `actions` — iOS and Android disagree on notification action-button
      // support, and SC-1 needs both platforms to behave identically.
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/home';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
