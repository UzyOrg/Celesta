const CACHE_NAME = 'celesta-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function shouldCache(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return false;
  if (url.pathname.startsWith('/workshops/')) return true;
  if (url.pathname.startsWith('/_next/static/')) return true;
  if (request.destination && ['style', 'script', 'image', 'font'].includes(request.destination)) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldCache(request)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cached); // offline fallback

      return cached || fetchPromise;
    })
  );
});
