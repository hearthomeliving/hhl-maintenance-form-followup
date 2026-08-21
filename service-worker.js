// Minimal service worker for the HAHL Maintenance Follow-Up PWA.
// Cache-first for the shell, never cache webhook GET/POST (they carry per-task data).

const CACHE_VERSION = 'hahl-followup-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  // Never cache webhook responses; task data is per-request.
  if (url.hostname.endsWith('n8n.cloud')) return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function () { return cached; });
    })
  );
});
