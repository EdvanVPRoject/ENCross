// Minimal Service Worker to enable PWA installation on Android and iOS
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle dynamic WebSocket and local LAN traffic directly
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
