// ============================================
// Smart School — Firebase Messaging Service Worker
// ============================================
// Service Worker للإشعارات في الـ background
// ⚠️ لازم يستخدم importScripts() مش import
// ⚠️ الـ SW مش بيقرا process.env — القيم لازم hardcoded
// ============================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ============================================
// Firebase Config (القيم الرسمية من Firebase Console)
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyAMA1_D291g_K1lBDI-JXx9Q_9BQqPuJGg",
  authDomain: "smart-school-notificatio-5bd03.firebaseapp.com",
  projectId: "smart-school-notificatio-5bd03",
  storageBucket: "smart-school-notificatio-5bd03.firebasestorage.app",
  messagingSenderId: "840126426142",
  appId: "1:840126426142:web:cad4f31a7d04765040d20f",
};

// ============================================
// Initialize Firebase
// ============================================
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ============================================
// Handle Background Messages
// ============================================
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Smart School';
  const notificationOptions = {
    body: payload.notification?.body || 'لديك إشعار جديد',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data || {},
    tag: payload.data?.tag || 'default',
    requireInteraction: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================
// Handle Notification Click
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================
// Service Worker Lifecycle
// ============================================
self.addEventListener('install', () => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(clients.claim());
});