// LeoCore Service Worker
const CACHE_NAME = 'leocore-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=liquid009',
  '/app.js?v=9999'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
