const CACHE_NAME = 'celesta-sw-v4';
const CREAR_SHELL_PATH = '/crear';

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

function isSuccessfulSameOriginResponse(request, response) {
  return (
    response &&
    response.ok &&
    new URL(request.url).origin === self.location.origin &&
    response.type !== 'opaque'
  );
}

function shouldCache(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (
    request.mode === 'navigate' &&
    (url.pathname === CREAR_SHELL_PATH || url.pathname.startsWith(`${CREAR_SHELL_PATH}/`))
  ) return true;
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
  if (
    request.mode === 'navigate' &&
    (url.pathname === CREAR_SHELL_PATH || url.pathname.startsWith(`${CREAR_SHELL_PATH}/`))
  ) {
    // Cache one query-free application shell. Pilot aliases and signed retest
    // tickets are bearer/identity data and must never become CacheStorage keys.
    const shellRequest = new Request(new URL(CREAR_SHELL_PATH, self.location.origin), {
      method: 'GET',
      credentials: 'same-origin',
    });

    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (isSuccessfulSameOriginResponse(request, networkResponse)) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(shellRequest, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(shellRequest);
          return cached ?? Response.error();
        })
    );
    return;
  }

  const networkFirst = url.pathname.startsWith('/workshops/');

  const fetchAndCache = async () => {
    const networkResponse = await fetch(request);
    if (isSuccessfulSameOriginResponse(request, networkResponse)) {
      const copy = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
    }
    return networkResponse;
  };

  if (networkFirst) {
    event.respondWith(
      fetchAndCache().catch(async () => (await caches.match(request)) ?? Response.error())
    );
    return;
  }

  // Static assets stay instant on weak networks and refresh in the background.
  // Bumping CACHE_NAME invalidates the lesson's currently unversioned audio.
  const refresh = fetchAndCache();
  event.waitUntil(refresh.then(() => undefined).catch(() => undefined));
  event.respondWith(
    caches.match(request).then((cached) => cached ?? refresh).catch(() => refresh)
  );
});
