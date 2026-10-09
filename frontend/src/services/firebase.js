// ============================================
// Smart School — Firebase Service
// ============================================
// خدمة Firebase للإشعارات
// - طلب الإذن
// - الحصول على FCM Token
// - الاستماع للإشعارات
// ============================================

import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from 'firebase/messaging';
import { firebaseConfig, VAPID_KEY } from '../firebase-config';

// ============================================
// Firebase App (singleton)
// ============================================
let app = null;
let messaging = null;

export function initFirebase() {
  if (app) return app;

  try {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] Initialized');
    return app;
  } catch (err) {
    console.error('[Firebase] Init error:', err);
    return null;
  }
}

// ============================================
// هل المتصفح يدعم الإشعارات؟
// ============================================
export async function isNotificationSupported() {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;

  try {
    const supported = await isSupported();
    return supported;
  } catch {
    return false;
  }
}

// ============================================
// طلب إذن الإشعارات من المستخدم
// ============================================
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { success: false, error: 'المتصفح مش بيدعم الإشعارات' };
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      return { success: true, permission };
    } else if (permission === 'denied') {
      return {
        success: false,
        permission,
        error: 'المستخدم رفض الإشعارات — لازم تفعلها من إعدادات المتصفح',
      };
    } else {
      return {
        success: false,
        permission,
        error: 'المستخدم سكّر الرسالة بدون اختيار',
      };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================
// الحصول على FCM Token
// ============================================
export async function getFCMToken() {
  try {
    if (!messaging) {
      initFirebase();
      messaging = getMessaging(app);
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      ),
    });

    if (token) {
      console.log('[FCM] Token obtained');
      return { success: true, token };
    } else {
      return {
        success: false,
        error: 'مفيش Token — جرب تطلب الإذن الأول',
      };
    }
  } catch (err) {
    console.error('[FCM] getToken error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// الاستماع للإشعارات (لما التطبيق مفتوح)
// ============================================
export function onForegroundMessage(callback) {
  try {
    if (!messaging) {
      initFirebase();
      messaging = getMessaging(app);
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message:', payload);
      callback(payload);
    });

    return unsubscribe;
  } catch (err) {
    console.error('[FCM] onMessage error:', err);
    return () => {};
  }
}

// ============================================
// تجربة سريعة
// ============================================
export async function initNotifications() {
  const supported = await isNotificationSupported();
  if (!supported) {
    return { success: false, error: 'الإشعارات مش مدعومة' };
  }

  const perm = await requestNotificationPermission();
  if (!perm.success) return perm;

  const tokenResult = await getFCMToken();
  if (!tokenResult.success) return tokenResult;

  return { success: true, token: tokenResult.token };
}