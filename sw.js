/* ===========================================================
   LEOCORE SERVICE WORKER — PRODUCTION STABLE
   Auto-Cache Busting: v1.0.[TIMESTAMP]
============================================================ */

// Generates a unique ID every time the script is parsed by the browser
const CACHE_NAME = `leocore-v${Date.now()}`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/android-chrome-192x192.png'
];

// 1. INSTALL: Fetch assets and force immediate activation
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE: Nuke all old caches to free up storage and fix bugs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: Network-First for logic, Cache-First for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRATEGY: Network-First for HTML, JS, and CSS
  // This ensures your "HTML tag scrubbing" fixes go live instantly
  if (
    url.pathname === '/' || 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // STRATEGY: Cache-First for static assets (Images/Icons)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
