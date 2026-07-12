/* Senj útikalauz — service worker (offline működés) */
const CACHE = 'senj-utikalauz-v28';
const CACHE_PREFIX = 'senj-utikalauz-';
const CORE = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'data.json',
  'manifest.webmanifest',
  'poppins.css',
  'fonts/poppins-400-latin.woff2',
  'fonts/poppins-400-latin-ext.woff2',
  'fonts/poppins-600-latin.woff2',
  'fonts/poppins-600-latin-ext.woff2',
  'fonts/poppins-700-latin.woff2',
  'fonts/poppins-700-latin-ext.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'ocean.webp',
  'images/places/B-0001.webp',
  'images/places/B-0004.webp',
  'images/places/B-0011.webp',
  'images/places/B-0022.webp',
  'images/places/B-0030.webp',
  'images/places/V-0001.webp',
  'images/places/V-0003.webp',
  'images/places/V-0004.webp',
  'images/places/V-0008.webp',
  'images/places/V-0014.webp',
  'images/places/V-0016.webp',
  'images/places/V-0017.webp',
  'images/places/V-0034.webp',
  'images/places/V-0036.webp',
  'images/places/B-0009.webp',
  'images/places/B-0010.webp',
  'images/places/B-0019.webp',
  'images/places/B-0021.webp',
  'images/places/B-0023.webp',
  'images/places/B-0028.webp',
  'images/places/B-0029.webp',
  'images/places/B-0032.webp',
  'images/places/B-0035.webp',
  'images/places/B-0037.webp',
  'images/places/B-0043.webp',
  'images/places/B-0050.webp',
  'images/places/B-0051.webp',
  'images/places/V-0002.webp',
  'images/places/V-0005.webp',
  'images/places/V-0009.webp',
  'images/places/V-0010.webp',
  'images/places/V-0011.webp',
  'images/places/V-0018.webp',
  'images/places/V-0020.webp',
  'images/places/V-0023.webp',
  'images/places/V-0027.webp',
  'images/places/V-0033.webp',
  'images/places/V-0037.webp',
  'images/places/V-0039.webp',
  'images/places/V-0046.webp',
  'images/places/B-0005.webp',
  'images/places/B-0007.webp',
  'images/places/B-0008.webp',
  'images/places/B-0013.webp',
  'images/places/B-0024.webp',
  'images/places/B-0038.webp',
  'images/places/V-0013.webp',
  'images/places/V-0021.webp',
  'images/places/V-0024.webp',
  'images/places/V-0025.webp',
  'images/places/V-0026.webp',
  'images/places/V-0030.webp',
  'images/places/V-0031.webp',
  'images/places/V-0032.webp',
  'images/places/V-0050.webp',
  'images/places/B-0034.webp',
  'images/places/V-0006.webp',
];
const CDN = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Egy hiányzó asset ne akadályozza meg a teljes offline frissítés telepítését.
    await Promise.all(CORE.map(async url => {
      try { await c.add(url); }
      catch (err) { console.warn('Nem sikerült offline eltárolni:', url, err); }
    }));
    // Leaflet a CDN-ről — offline-hoz eltesszük (opaque válaszként is jó)
    await Promise.all(CDN.map(async u => {
      try { await c.add(new Request(u, { mode: 'no-cors' })); } catch (err) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // A Cache Storage origin-szintű: csak a saját régi cache-einket töröljük.
    for (const k of await caches.keys()) {
      if (k.startsWith(CACHE_PREFIX) && k !== CACHE) await caches.delete(k);
    }
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
