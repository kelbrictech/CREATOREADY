const CACHE_VERSION = 'creatoready-v2';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/embedded-1.webp',
  '/assets/embedded-2.webp',
  '/assets/embedded-3.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];
const FFMPEG_CDN = 'https://cdn.jsdelivr.net/';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const isShellNavigation = event.request.mode === 'navigate';
  const isLocal = requestUrl.origin === self.location.origin;
  const isPinnedFFmpeg = requestUrl.href.startsWith(FFMPEG_CDN + 'npm/@ffmpeg/');

  if (!isLocal && !isPinnedFFmpeg) return;

  event.respondWith(
    caches.match(isShellNavigation ? '/index.html' : event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    }).catch(() => {
      if (isShellNavigation) return caches.match('/index.html');
      throw new Error('Resource unavailable offline');
    })
  );
});
