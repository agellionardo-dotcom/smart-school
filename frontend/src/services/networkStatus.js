import { Network } from '@capacitor/network';

let currentStatus = { connected: true, connectionType: 'unknown' };
const listeners = new Set();

// ✅ بدء مراقبة الشبكة
export const startNetworkMonitoring = (callback) => {
  // فحص أولي
  Network.getStatus().then((status) => {
    currentStatus = status;
    callback(status.connected);
  });

  // مراقبة التغييرات
  const listener = Network.addListener('networkStatusChange', (status) => {
    currentStatus = status;
    console.log('[Network] Status changed:', status);
    callback(status.connected);

    // إشعار كل المستمعين
    listeners.forEach((fn) => fn(status.connected));
  });

  return listener;
};

// ✅ فحص سريع للشبكة
export const isOnline = async () => {
  try {
    const status = await Network.getStatus();
    currentStatus = status;
    return status.connected;
  } catch {
    // fallback للمتصفح
    return navigator.onLine;
  }
};

// ✅ الحالة الحالية
export const getCurrentStatus = () => currentStatus;

// ✅ الاشتراك في تغييرات الشبكة
export const subscribeToNetwork = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};