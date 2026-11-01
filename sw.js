const CACHE_VERSION = 'creatoready-v5';
const base = new URL('./', self.registration.scope);
const appURL = path => new URL(path,base).href;
const SHELL = [
  '', 'index.html', 'manifest.webmanifest',
  'assets/embedded-1.webp', 'assets/embedded-2.webp', 'assets/embedded-3.png',
  'icons/icon-192.png', 'icons/icon-512.png',
  'vendor/ffmpeg/ffmpeg.js', 'vendor/ffmpeg/814.ffmpeg.js',
  'legal.css', 'legal.html', 'terms.html', 'privacy.html', 'cookies.html', 'copyright.html', 'accessibility.html', 'licenses.html'
].map(appURL);
const FFMPEG_CDN = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET')return;
  const url = new URL(event.request.url);
  const local = url.origin === base.origin && url.pathname.startsWith(base.pathname);
  const core = url.href.startsWith(FFMPEG_CDN);
  if(!local && !core)return;
  if(event.request.mode === 'navigate'){
    event.respondWith(fetch(event.request).then(response => {
      if(response.ok)caches.open(CACHE_VERSION).then(cache => cache.put(event.request,response.clone())).catch(()=>{});
      return response;
    }).catch(async () => {
      const cached=await caches.match(event.request);
      if(cached)return cached;
      return new Response('This page is unavailable offline. Reconnect and try again.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if(response.ok)caches.open(CACHE_VERSION).then(cache => cache.put(event.request,response.clone())).catch(()=>{});
    return response;
  })));
});
