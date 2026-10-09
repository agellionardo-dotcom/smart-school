import { Network } from '@capacitor/network';

let currentStatus = { connected: true, connectionType: 'unknown' };
const listeners = new Set();
let networkListenerHandle = null; // ✅ لحفظ الـ listener الحقيقي

// ============================================
// ✅ بدء مراقبة الشبكة
// ============================================
export const startNetworkMonitoring = async (callback) => {
  // فحص أولي
  try {
    const status = await Network.getStatus();
    currentStatus = status;
    callback(status.connected);
  } catch (err) {
    console.warn('[Network] getStatus failed:', err);
    callback(navigator.onLine);
  }

  // مراقبة التغييرات — ✅ await عشان ناخد الـ listener الحقيقي
  try {
    networkListenerHandle = await Network.addListener(
      'networkStatusChange',
      (status) => {
        currentStatus = status;
        console.log('[Network] Status changed:', status);
        callback(status.connected);

        // إشعار كل المستمعين
        listeners.forEach((fn) => fn(status.connected));
      }
    );

    return networkListenerHandle;
  } catch (err) {
    console.warn('[Network] addListener failed:', err);
    return null;
  }
};

// ============================================
// ✅ إيقاف المراقبة (اختياري)
// ============================================
export const stopNetworkMonitoring = async () => {
  if (networkListenerHandle && typeof networkListenerHandle.remove === 'function') {
    await networkListenerHandle.remove();
    networkListenerHandle = null;
  }
};

// ============================================
// ✅ فحص سريع للشبكة
// ============================================
export const isOnline = async () => {
  try {
    const status = await Network.getStatus();
    currentStatus = status;
    return status.connected;
  } catch {
    return navigator.onLine;
  }
};

// ============================================
// ✅ الحالة الحالية
// ============================================
export const getCurrentStatus = () => currentStatus;

// ============================================
// ✅ الاشتراك في تغييرات الشبكة
// ============================================
export const subscribeToNetwork = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};