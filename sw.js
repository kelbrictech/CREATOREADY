// Disable all legacy offline caching; every editor request must reach Cloudflare access control.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('creatoready-')).map(name => caches.delete(name)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
// Intentionally no fetch handler.
