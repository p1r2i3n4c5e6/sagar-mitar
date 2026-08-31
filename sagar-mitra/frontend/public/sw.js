/* ============================================================
   SAGAR-MITRA Service Worker & Offline Tile Engine
   Strategy:
     - Map Tiles (.png / tile.openstreetmap.org) → Cache First ('sagar-tiles-v1')
     - Geofence Vectors & GeoJSON               → Cache First ('sagar-geodata-v1')
     - App Shell (HTML/JS/CSS/fonts)            → Cache First ('sagar-mitra-shell-v1')
     - Advisory APIs & dynamic JSON             → Stale-While-Revalidate
   ============================================================ */

const CACHE_VERSION     = 'v1';
const APP_SHELL_CACHE   = `sagar-mitra-shell-${CACHE_VERSION}`;
const ADVISORY_CACHE    = `sagar-mitra-advisory-${CACHE_VERSION}`;
const TILE_CACHE_NAME   = 'sagar-tiles-v1';
const GEO_CACHE_NAME    = 'sagar-geodata-v1';

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/anchor.svg',
];

// ── Install: pre-cache app shell ─────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      cache.addAll(APP_SHELL_ASSETS)
    )
  );
  self.skipWaiting();
});

// ── Activate: purge old caches (preserves map tiles & geodata) ──────────
self.addEventListener('activate', (event) => {
  const ALLOWED_CACHES = [APP_SHELL_CACHE, ADVISORY_CACHE, TILE_CACHE_NAME, GEO_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALLOWED_CACHES.includes(k) && !k.startsWith('sagar-tiles') && !k.startsWith('sagar-geodata'))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: routing logic ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. OpenStreetMap Tile Requests → Cache First (sagar-tiles-v1)
  if (url.hostname.includes('tile.openstreetmap.org') || (url.pathname.includes('/8/') || url.pathname.includes('/9/') || url.pathname.includes('/10/') || url.pathname.includes('/11/') || url.pathname.includes('/12/'))) {
    event.respondWith(cacheFirstTile(request));
    return;
  }

  // 2. Offline GeoJSON Vector Cache → Cache First (sagar-geodata-v1)
  if (url.pathname.startsWith('/offline/geo/')) {
    event.respondWith(cacheFirstGeo(request));
    return;
  }

  // 3. Advisory API JSON → Stale-While-Revalidate
  if (url.pathname.startsWith('/api/advisory') || url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(request, ADVISORY_CACHE));
    return;
  }

  // 4. App shell assets → Cache First
  if (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    return;
  }

  // 5. Everything else → Network First (fallback to cache)
  event.respondWith(networkFirst(request, APP_SHELL_CACHE));
});

// ── Strategy helpers ─────────────────────────────────────────

async function cacheFirstTile(request) {
  const tileCache = await caches.open(TILE_CACHE_NAME);
  const cached = await tileCache.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request, { mode: 'cors' });
    if (response.ok) {
      tileCache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 404, statusText: 'Tile Not Cached Offline' });
  }
}

async function cacheFirstGeo(request) {
  const geoCache = await caches.open(GEO_CACHE_NAME);
  const cached = await geoCache.match(request);
  if (cached) return cached;
  return new Response('{"error":"Not cached"}', { status: 404, headers: { 'Content-Type': 'application/json' } });
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
