/* Service Worker - Smart School PWA */
const CACHE_NAME = 'smart-school-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo.png'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// اعتراض الطلبات
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات API — نخليها تروح للـ network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // تجاهل الـ POST/PUT/DELETE
  if (request.method !== 'GET') {
    return;
  }

  // استراتيجية: Network First ثم Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // خزّن نسخة في الـ cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // لو مفيش نت → استخدم الـ cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // لو مفيش في cache → رجّع index.html للـ SPA
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});