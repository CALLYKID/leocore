/* ===========================================================
   LEOCORE SERVICE WORKER — PRODUCTION BUILD
   Strategy: Network-First (for instant updates)
============================================================ */

const CACHE_NAME = 'leocore-v1.2.0';

// Files to store for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/android-chrome-192x192.png'
];

// 1. INSTALL: Save assets to cache
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('LeoCore: Caching Shell Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE: Cleanup old versions of Leocore
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('LeoCore: Clearing Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: The Logic
self.addEventListener('fetch', (event) => {
  // We only care about GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // STRATEGY: Network-First for Code (HTML, JS, CSS)
  // This ensures your "HTML tag scrubbing" and UI fixes go live immediately.
  if (
    url.pathname === '/' || 
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') ||
    url.pathname.startsWith('/modes/')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network is successful, update the cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails (offline), use the cache
          return caches.match(event.request);
        })
    );
  } else {
    // STRATEGY: Cache-First for static assets (Images/Icons)
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
