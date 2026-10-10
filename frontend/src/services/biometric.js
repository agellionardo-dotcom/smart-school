// ============================================
// ✅ Biometric Service
// يدعم البصمة على Android/iOS + Fallback
// ============================================

import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import api from '../api';

// ============================================
// ✅ مفاتيح التخزين
// ============================================
const BIOMETRIC_TOKEN_KEY = 'biometric_refresh_token';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const DEVICE_ID_KEY = 'device_id';

// ============================================
// ✅ 1. التحقق من توفر البصمة
// ============================================
export const checkBiometricAvailability = async () => {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'متصفح فقط', type: null };
  }

  try {
    const result = await BiometricAuth.checkBiometry();
    return {
      available: result.isAvailable,
      type: result.biometryType || null, // 'fingerprint' | 'faceId' | 'iris'
      reason: result.reason || null,
    };
  } catch (err) {
    console.warn('Biometric check error:', err);
    return { available: false, reason: err.message, type: null };
  }
};

// ============================================
// ✅ 2. جلب/إنشاء Device ID فريد
// ============================================
export const getDeviceId = async () => {
  try {
    const { value } = await Preferences.get({ key: DEVICE_ID_KEY });
    if (value) return value;

    const info = await Device.getId();
    const deviceId = info.identifier;
    await Preferences.set({ key: DEVICE_ID_KEY, value: deviceId });
    return deviceId;
  } catch (err) {
    // Fallback: استخدم localStorage
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'web-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }
};

// ============================================
// ✅ 3. جلب معلومات الجهاز
// ============================================
export const getDeviceInfo = async () => {
  try {
    const info = await Device.getInfo();
    const deviceId = await getDeviceId();

    return {
      deviceId,
      deviceName: `${info.manufacturer || ''} ${info.model || ''}`.trim() || 'Unknown',
      deviceModel: info.model || 'Unknown',
      platform: info.platform || 'web', // 'android' | 'ios' | 'web'
    };
  } catch (err) {
    console.warn('Device info error:', err);
    return {
      deviceId: await getDeviceId(),
      deviceName: 'Unknown',
      deviceModel: 'Unknown',
      platform: 'web',
    };
  }
};

// ============================================
// ✅ 4. تفعيل البصمة
// ============================================
export const enableBiometric = async () => {
  // 1. تحقق من توفر البصمة
  const availability = await checkBiometricAvailability();
  if (!availability.available) {
    throw new Error('البصمة غير متوفرة على الجهاز');
  }

  // 2. اطلب من المستخدم بصمة للتأكيد
  try {
    await BiometricAuth.authenticate({
      reason: 'فعّل الدخول بالبصمة',
      cancelTitle: 'إلغاء',
      allowDeviceCredential: false,
      iosFallbackTitle: 'استخدم كلمة المرور',
      androidTitle: 'تفعيل البصمة',
      androidSubtitle: 'ضع بصمتك للمتابعة',
      androidConfirmationRequired: false,
    });
  } catch (err) {
    throw new Error('تم إلغاء التفعيل');
  }

  // 3. جلب معلومات الجهاز
  const deviceInfo = await getDeviceInfo();

  // 4. إرسال الطلب للـ Backend
  const { data } = await api.post('/auth/biometric/enable', {
    ...deviceInfo,
    biometricType: availability.type,
  });

  if (!data.success) {
    throw new Error(data.msg || 'فشل التفعيل');
  }

  // 5. تخزين الـ refresh token
  await Preferences.set({
    key: BIOMETRIC_TOKEN_KEY,
    value: data.refreshToken,
  });
  await Preferences.set({
    key: BIOMETRIC_ENABLED_KEY,
    value: 'true',
  });

  return {
    success: true,
    biometricType: data.biometricType || availability.type,
  };
};

// ============================================
// ✅ 5. تسجيل الدخول بالبصمة
// ============================================
export const loginWithBiometric = async () => {
  // 1. تحقق إن البصمة مفعّلة
  const enabled = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
  if (enabled.value !== 'true') {
    throw new Error('البصمة مش مفعّلة — سجّل دخول عادي الأول');
  }

  // 2. جلب الـ refresh token
  const { value: refreshToken } = await Preferences.get({
    key: BIOMETRIC_TOKEN_KEY,
  });
  if (!refreshToken) {
    throw new Error('مفيش token محفوظ — سجّل دخول عادي الأول');
  }

  // 3. اطلب البصمة
  try {
    await BiometricAuth.authenticate({
      reason: 'سجّل دخولك بالبصمة',
      cancelTitle: 'إلغاء',
      allowDeviceCredential: false,
      iosFallbackTitle: 'استخدم كلمة المرور',
      androidTitle: 'تسجيل الدخول',
      androidSubtitle: 'ضع بصمتك',
      androidConfirmationRequired: false,
    });
  } catch (err) {
    throw new Error('تم إلغاء تسجيل الدخول');
  }

  // 4. إرسال الطلب للـ Backend
  const deviceId = await getDeviceId();

  const { data } = await api.post('/auth/biometric/login', {
    deviceId,
    refreshToken,
  });

  if (!data.success) {
    throw new Error(data.msg || 'فشل تسجيل الدخول');
  }

  return {
    success: true,
    token: data.token,
    user: data.user,
  };
};

// ============================================
// ✅ 6. إلغاء تفعيل البصمة
// ============================================
export const disableBiometric = async () => {
  try {
    const deviceId = await getDeviceId();
    await api.post('/auth/biometric/disable', { deviceId });
  } catch (err) {
    console.warn('Server disable failed:', err);
  }

  // امسح التخزين المحلي
  await Preferences.remove({ key: BIOMETRIC_TOKEN_KEY });
  await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: 'false' });

  return { success: true };
};

// ============================================
// ✅ 7. هل البصمة مفعّلة؟
// ============================================
export const isBiometricEnabled = async () => {
  try {
    const { value } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
    return value === 'true';
  } catch (err) {
    return localStorage.getItem('biometric_enabled') === 'true';
  }
};

// ============================================
// ✅ 8. حالة البصمة الكاملة
// ============================================
export const getBiometricStatus = async () => {
  try {
    const deviceId = await getDeviceId();
    const { data } = await api.get(
      `/auth/biometric/status?deviceId=${deviceId}`
    );
    return data;
  } catch (err) {
    console.warn('Biometric status error:', err);
    return null;
  }
};

// ============================================
// ✅ 9. قائمة الأجهزة الموثوقة
// ============================================
export const getTrustedDevices = async () => {
  try {
    const deviceId = await getDeviceId();
    const { data } = await api.get(
      `/auth/biometric/devices?currentDeviceId=${deviceId}`
    );
    return data;
  } catch (err) {
    console.warn('Devices list error:', err);
    return { devices: [], biometricLogin: false };
  }
};

// ============================================
// ✅ 10. مسح كل بيانات البصمة
// ============================================
export const clearBiometricData = async () => {
  try {
    await Preferences.remove({ key: BIOMETRIC_TOKEN_KEY });
    await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY });
    localStorage.removeItem('biometric_enabled');
  } catch (err) {
    console.warn('Clear error:', err);
  }
};

export default {
  checkBiometricAvailability,
  getDeviceId,
  getDeviceInfo,
  enableBiometric,
  loginWithBiometric,
  disableBiometric,
  isBiometricEnabled,
  getBiometricStatus,
  getTrustedDevices,
  clearBiometricData,
};