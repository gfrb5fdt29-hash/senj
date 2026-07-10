/* Senj útikalauz — service worker (offline működés) */
const CACHE = 'senj-utikalauz-v2';
const CORE = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'data.json',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];
const CDN = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    // Leaflet a CDN-ről — offline-hoz eltesszük (opaque válaszként is jó)
    await Promise.all(CDN.map(async u => {
      try { await c.add(new Request(u, { mode: 'no-cors' })); } catch (err) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // térképcsempéket nem tárolunk (nagy méret, online-only)
  if (url.hostname.includes('cartocdn')) return;

  e.respondWith((async () => {
    const sameOrigin = url.origin === location.origin;
    const cached = await caches.match(e.request, { ignoreSearch: sameOrigin });

    // Az alkalmazás váza online mindig frissül; offline a legutóbbi jó példány indul.
    if (sameOrigin && (e.request.mode === 'navigate' || /\.(?:js|css|json|webmanifest)$/.test(url.pathname))) {
      try {
        const resp = await fetch(e.request, { cache: 'no-cache' });
        if (resp.ok) {
          const c = await caches.open(CACHE);
          await c.put(e.request.mode === 'navigate' ? 'index.html' : e.request, resp.clone());
        }
        return resp;
      } catch (err) {
        if (cached) return cached;
        if (e.request.mode === 'navigate') return caches.match('index.html');
        throw err;
      }
    }

    if (cached) return cached;
    try {
      const resp = await fetch(e.request);
      if (sameOrigin && resp.ok) {
        const c = await caches.open(CACHE);
        c.put(e.request, resp.clone());
      }
      return resp;
    } catch (err) {
      if (e.request.mode === 'navigate') return caches.match('index.html');
      throw err;
    }
  })());
});
