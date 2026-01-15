/* ================= SW.JS REFINED ================= */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // FORCE FRESH for app.js and index.html
  // This stops the browser from loading the version that saves HTML tags
  if (url.pathname.endsWith('app.js') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
