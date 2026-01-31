/* ===========================================================
   LEOCORE SERVICE WORKER — VERCEL CREDIT SAVER
   Strategy: Stale-While-Revalidate
============================================================ */

// Using a timestamp so the cache name is unique per deploy
const CACHE_NAME = `leocore-v${new Date().getTime()}`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/android-chrome-192x192.png',
  '/manifest.json'
];

// 1. INSTALL: Populate the "Shield"
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE: Nuke the old credits-thieves
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: The Shield Logic
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Logic: Serve from cache immediately if it exists
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // If we got a fresh response from Vercel, update the cache
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });

      // Return the cache if we have it, otherwise wait for Vercel
      return cachedResponse || fetchPromise;
    })
  );
});
