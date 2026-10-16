// ============================================
// Smart School — Service Worker (PWA)
// ============================================
// للـ Offline Mode + Cache
// ⚠️ مختلف عن firebase-messaging-sw.js
// ============================================

const CACHE_VERSION = 'smart-school-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// ============================================
// Install — لا نخزّن حاجة مسبقًا
// (نتجنب مشكلة الملفات اللي مش موجودة)
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll(['/manifest.json', '/logo.png']).catch(() => {})
      )
      .then(() => self.skipWaiting())
  );
});

// ============================================
// Activate — حذف الكاش القديم
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ============================================
// Fetch — استراتيجية حسب نوع الطلب
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ✅ تجاهل الطلبات دي (سيبها تروح للـ network):
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('railway') ||
    url.hostname.includes('cloudinary') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // ✅ للـ HTML — Network first (عشان التحديثات)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // ✅ للصور — Cache first
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              const copy = response.clone();
              caches
                .open(RUNTIME_CACHE)
                .then((cache) => cache.put(request, copy));
              return response;
            })
            .catch(() => caches.match('/logo.png'))
      )
    );
    return;
  }

  // ✅ الافتراضي — Network first ثم Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ============================================
// رسائل من الصفحة الرئيسية
// ============================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    );
  }
});