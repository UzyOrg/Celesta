const CACHE_NAME = 'celesta-sw-v3';

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
  if (request.mode === 'navigate' && url.pathname.startsWith('/crear')) return true;
  if (url.pathname.startsWith('/workshops/')) return true;
  if (url.pathname.startsWith('/audio/')) return true;
  if (url.pathname.startsWith('/_next/static/')) return true;
  if (request.destination && ['style', 'script', 'image', 'font'].includes(request.destination)) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldCache(request)) return;

  const url = new URL(request.url);
  if (request.mode === 'navigate' && url.pathname.startsWith('/crear')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? Response.error();
        })
    );
    return;
  }

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
