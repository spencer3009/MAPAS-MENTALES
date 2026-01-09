/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'mindora-cache-v1';

// Lista de recursos estáticos para cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/favicon-16.png',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Install failed:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activated successfully');
        return self.clients.claim();
      })
  );
});

// Estrategia de caché: Network First (para datos dinámicos)
// Si la red falla, usa el caché
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests a extensiones de Chrome, hot reload, etc.
  if (
    url.protocol === 'chrome-extension:' ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('sockjs-node') ||
    url.pathname.includes('__webpack')
  ) {
    return;
  }

  // Para API calls, usar solo network (no cachear datos dinámicos)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Para assets estáticos y páginas, usar Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, guardar en caché
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Si la red falla, buscar en caché
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay caché, devolver página principal para SPA routing
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Manejar notificaciones push (futuro)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Mindora',
    icon: '/favicon.png',
    badge: '/favicon-16.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Mindora', options)
  );
});

// Manejar click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});
