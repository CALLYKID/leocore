const CACHE_NAME = 'leocore-v2'; // Increment this whenever you deploy
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/android-chrome-192x192.png'
];

// Install event — cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate event — remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});

// Fetch event — smart cache
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Always fetch fresh JS/CSS to prevent Chrome caching old scroll logic
  if (url.endsWith('.js') || url.endsWith('.css')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else (images, HTML, icons)
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});