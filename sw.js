// Service worker for Smart finEx — receives background push alerts.
// Pushes are sent WITHOUT a payload (no encryption needed); on wake we fetch
// the pending message for this subscription from /api/pending and show it.

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'Smart finEx';
    let body = 'Rate alert triggered — open the app for details.';
    try {
      if (event.data) {
        const d = event.data.json();
        if (d && d.title) { title = d.title; body = d.body || body; }
      } else {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) {
          const res = await fetch('/api/pending?e=' + encodeURIComponent(sub.endpoint));
          if (res.ok) {
            const d = await res.json();
            if (d && d.title) { title = d.title; body = d.body || body; }
          }
        }
      }
    } catch (err) {}
    await self.registration.showNotification(title, {
      body,
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png'
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length > 0) { all[0].focus(); return; }
    await self.clients.openWindow('/');
  })());
});
