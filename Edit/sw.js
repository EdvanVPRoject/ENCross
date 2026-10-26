// Minimal Service Worker to enable PWA installation on Android and iOS
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle dynamic WebSocket, API, and local LAN traffic directly
  try {
    const url = new URL(event.request.url);
    if (
      event.request.method !== 'GET' ||
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/socket.io') ||
      (url.hostname !== 'localhost' && url.hostname !== self.location.hostname)
    ) {
      return;
    }
  } catch (_) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
