// TimeFlies — Service Worker v10
// Estratégia: Cache First para recursos estáticos, Network First para CDNs

const CACHE_NAME = 'timeflies-v11';

// Recursos locais que serão sempre cacheados no install
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// CDNs que serão cacheadas após primeira requisição (Network First)
const CDN_URLS = [
  'https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

// ─── INSTALL: pré-cacheia recursos locais ───────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE: limpa caches antigos ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH: estratégia inteligente por tipo de recurso ─────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Recursos locais → Cache First (app carrega instantâneo offline)
  if (url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        });
      })
    );
    return;
  }

  // CDNs (Lucide, Chart.js, Fonts) → Network First com fallback ao cache
  const isCDN = CDN_URLS.some(cdn => url.startsWith(cdn));
  if (isCDN) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
