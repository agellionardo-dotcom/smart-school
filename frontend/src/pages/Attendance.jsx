import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api';
import {
  addToQueue,
  cacheData,
  getCachedData,
  getQueueCount,
} from '../services/offlineStorage';
import { isOnline } from '../services/networkStatus';
import { toCairoTime } from '../utils/dateHelpers';
import { GlassCard, GradientButton } from '../components/ui';

// ✅ Biometric — يدعم Web + Mobile
let BiometricAuth = null;
let Capacitor = null;

try {
  const biometricModule = require('@aparajita/capacitor-biometric-auth');
  BiometricAuth = biometricModule.BiometricAuth;
  const capacitorCore = require('@capacitor/core');
  Capacitor = capacitorCore.Capacitor;
} catch (err) {
  console.warn('Biometric not available:', err.message);
}

export default function Attendance() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [detectedBranch, setDetectedBranch] = useState(null);

  // ✅ جديد — حالة البصمة
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  const userRef = useRef(JSON.parse(localStorage.getItem('user') || '{}'));
  const user = userRef.current;

  // ============================================
  // ✅ فحص توفر البصمة
  // ============================================
  const checkBiometric = useCallback(async () => {
    try {
      if (!BiometricAuth || !Capacitor) {
        setBiometricAvailable(false);
        return;
      }
      if (!Capacitor.isNativePlatform()) {
        setBiometricAvailable(false);
        return;
      }

      const result = await BiometricAuth.checkBiometry();
      setBiometricAvailable(result.isAvailable);
      setBiometricType(result.biometryType || null);
    } catch (err) {
      console.warn('Biometric check error:', err);
      setBiometricAvailable(false);
    }
  }, []);

  // ============================================
  // ✅ الحصول على الموقع
  // ============================================
  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('المتصفح لا يدعم تحديد الموقع'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  // ============================================
  // ✅ التحقق بالبصمة
  // ============================================
  const authenticateBiometric = useCallback(
    async (reason) => {
      if (!biometricAvailable || !BiometricAuth) {
        return { success: false, used: false };
      }

      try {
        await BiometricAuth.authenticate({
          reason: reason || 'سجّل حضورك',
          cancelTitle: 'إلغاء',
          allowDeviceCredential: false,
          iosFallbackTitle: 'استخدم كلمة المرور',
          androidTitle: 'تسجيل الحضور',
          androidSubtitle: 'ضع بصمتك',
          androidConfirmationRequired: false,
        });
        return { success: true, used: true };
      } catch (err) {
        console.warn('Biometric auth error:', err);
        // المستخدم لغى — نكمل بدون بصمة (Fallback)
        return { success: false, used: false, cancelled: true };
      }
    },
    [biometricAvailable]
  );

  // ============================================
  // ✅ عرض رسالة
  // ============================================
  const showMsg = useCallback((text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  }, []);

  // ============================================
  // ✅ تحميل حضور اليوم
  // ============================================
  const loadToday = useCallback(async () => {
    try {
      setLoading(true);
      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        const { data } = await api.get('/attendance/today');
        setTodayAttendance(data);
        if (data.branch) {
          setDetectedBranch({
            name: data.branch.name,
            type: data.branch.type,
          });
        }
        await cacheData('today_attendance', data);
      } else {
        const cached = await getCachedData('today_attendance', 1440);
        if (cached) {
          setTodayAttendance(cached);
          showMsg('📴 وضع أوفلاين — البيانات المخزنة', 'warning');
        } else {
          showMsg('📴 وضع أوفلاين — لا توجد بيانات مخزنة', 'warning');
        }
      }
    } catch (err) {
      console.error('loadToday error:', err);
      const cached = await getCachedData('today_attendance', 1440);
      if (cached) {
        setTodayAttendance(cached);
      } else if (err.response?.status === 401) {
        showMsg('🔐 الجلسة انتهت — من فضلك سجّل دخول من جديد', 'error');
      } else if (err.response?.status === 404) {
        showMsg('⚠️ خطأ في الاتصال بالسيرفر (404)', 'error');
      } else {
        showMsg('❌ فشل تحميل البيانات', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  // ============================================
  // ✅ عدد الطلبات المعلقة
  // ============================================
  const loadQueueCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setQueueCount(count);
    } catch (err) {
      console.warn('Queue count error:', err);
    }
  }, []);

  // ============================================
  // ✅ useEffect
  // ============================================
  useEffect(() => {
    loadToday();
    loadQueueCount();
    checkBiometric();

    const interval = setInterval(loadQueueCount, 5000);
    return () => clearInterval(interval);
  }, [loadToday, loadQueueCount, checkBiometric]);

  // ============================================
  // ✅ تسجيل الحضور (GPS + Biometric Fallback)
  // ============================================
  const handleCheckIn = useCallback(async () => {
    setActionLoading(true);
    setDetectedBranch(null);
    try {
      // 1. ✅ الموقع (إجباري)
      let location = null;
      try {
        location = await getLocation();
      } catch (err) {
        showMsg('⚠️ فشل الحصول على الموقع: ' + err.message, 'warning');
      }

      // 2. ✅ البصمة (اختيارية — لو متاحة)
      let biometricUsed = false;
      let bioType = null;

      if (biometricAvailable && biometricEnabled) {
        const bio = await authenticateBiometric('سجّل حضورك');
        biometricUsed = bio.used;
        bioType = bio.used ? biometricType : null;

        if (bio.cancelled) {
          showMsg('ℹ️ تم التخطي — سيتم التسجيل بالموقع فقط', 'info');
        }
      }

      // 3. ✅ إرسال الطلب
      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        const payload = {
          lat: location?.lat,
          lng: location?.lng,
          biometricUsed,
          biometricType: bioType,
          deviceId: user._id, // مؤقت — يستبدل بـ Device ID حقيقي
        };

        const { data } = await api.post('/attendance/checkin', payload);
        setTodayAttendance(data);

        if (data.detectedBranch) {
          setDetectedBranch(data.detectedBranch);
          showMsg(
            `✅ تم التسجيل من ${data.detectedBranch.name} (${data.detectedBranch.distance} متر)${biometricUsed ? ' 🔐' : ''}`,
            'success'
          );
        } else {
          showMsg(
            `✅ تم تسجيل الحضور${biometricUsed ? ' بالبصمة 🔐' : ''}`,
            'success'
          );
        }

        await cacheData('today_attendance', data);
      } else {
        await addToQueue({
          type: 'checkin',
          lat: location?.lat,
          lng: location?.lng,
          user: user._id,
          biometricUsed,
          biometricType: bioType,
        });
        await loadQueueCount();
        showMsg('📴 تم الحفظ محلياً — سيتم المزامنة عند عودة الإنترنت', 'warning');
      }
    } catch (err) {
      console.error('checkIn error:', err);
      const errMsg =
        err.response?.data?.msg ||
        err.response?.data?.message ||
        err.message;
      showMsg('❌ ' + errMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [
    getLocation,
    loadQueueCount,
    showMsg,
    user._id,
    biometricAvailable,
    biometricEnabled,
    biometricType,
    authenticateBiometric,
  ]);

  // ============================================
  // ✅ تسجيل الانصراف
  // ============================================
  const handleCheckOut = useCallback(async () => {
    setActionLoading(true);
    try {
      let location = null;
      try {
        location = await getLocation();
      } catch (err) {
        showMsg('⚠️ فشل الحصول على الموقع', 'warning');
      }

      // ✅ البصمة (اختيارية)
      let biometricUsed = false;
      let bioType = null;

      if (biometricAvailable && biometricEnabled) {
        const bio = await authenticateBiometric('سجّل انصرافك');
        biometricUsed = bio.used;
        bioType = bio.used ? biometricType : null;
      }

      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        const payload = {
          lat: location?.lat,
          lng: location?.lng,
          biometricUsed,
          biometricType: bioType,
        };

        const { data } = await api.post('/attendance/checkout', payload);
        setTodayAttendance(data);

        if (data.detectedBranch) {
          setDetectedBranch(data.detectedBranch);
          showMsg(`✅ تم الانصراف من ${data.detectedBranch.name}`, 'success');
        } else {
          showMsg(
            `✅ تم تسجيل الانصراف${biometricUsed ? ' بالبصمة 🔐' : ''}`,
            'success'
          );
        }

        await cacheData('today_attendance', data);
      } else {
        await addToQueue({
          type: 'checkout',
          lat: location?.lat,
          lng: location?.lng,
          user: user._id,
          biometricUsed,
          biometricType: bioType,
        });
        await loadQueueCount();
        showMsg('📴 تم الحفظ محلياً — سيتم المزامنة عند عودة الإنترنت', 'warning');
      }
    } catch (err) {
      console.error('checkOut error:', err);
      const errMsg =
        err.response?.data?.msg ||
        err.response?.data?.message ||
        err.message;
      showMsg('❌ ' + errMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [
    getLocation,
    loadQueueCount,
    showMsg,
    user._id,
    biometricAvailable,
    biometricEnabled,
    biometricType,
    authenticateBiometric,
  ]);

  // ============================================
  // ✅ Loading
  // ============================================
  if (loading) {
    return (
      <div className="dashboard">
        <GlassCard padding="lg">
          <p
            style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.7)',
              margin: 0,
            }}
          >
            ⏳ جاري التحميل...
          </p>
        </GlassCard>
      </div>
    );
  }

  const checkedIn = todayAttendance?.checkIn;
  const checkedOut = todayAttendance?.checkOut;
  const usedBiometric = todayAttendance?.verification?.biometricUsed;

  // ============================================
  // ✅ Render
  // ============================================
  return (
    <div className="dashboard">
      {/* ✅ Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            marginBottom: 8,
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          📍 الحضور والانصراف
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 14 }}>
          الفرع: {user.branch?.name || 'غير محدد'}
        </p>
      </div>

      {/* ✅ حالة الشبكة + البصمة */}
      <div
        className="ss-glass"
        style={{
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          borderRight: online ? '3px solid #10b981' : '3px solid #fbbf24',
        }}
      >
        <span
          style={{
            color: online ? '#34d399' : '#fcd34d',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {online ? '🌐 متصل بالإنترنت' : '📴 غير متصل — وضع أوفلاين'}
        </span>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* ✅ عرض حالة البصمة */}
          {biometricAvailable && (
            <button
              onClick={() => setBiometricEnabled(!biometricEnabled)}
              style={{
                background: biometricEnabled
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(255,255,255,0.05)',
                color: biometricEnabled ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                border: `1px solid ${
                  biometricEnabled
                    ? 'rgba(168, 85, 247, 0.3)'
                    : 'rgba(255,255,255,0.1)'
                }`,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title={
                biometricEnabled
                  ? 'البصمة مفعّلة — اضغط لتعطيلها'
                  : 'البصمة معطّلة — اضغط لتفعيلها'
              }
            >
              {biometricEnabled ? '🔐 بصمة' : '🔓 بدون بصمة'}
            </button>
          )}

          {queueCount > 0 && (
            <span
              style={{
                background: 'linear-gradient(135deg, #fb923c, #ef4444)',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(251,146,60,0.4)',
              }}
            >
              ⏳ {queueCount}
            </span>
          )}
        </div>
      </div>

      {/* ✅ رسالة */}
      {msg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            direction: 'rtl',
            textAlign: 'right',
            background:
              msgType === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : msgType === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : msgType === 'warning'
                ? 'rgba(251, 191, 36, 0.15)'
                : 'rgba(0, 229, 255, 0.15)',
            color:
              msgType === 'success'
                ? '#34d399'
                : msgType === 'error'
                ? '#fca5a5'
                : msgType === 'warning'
                ? '#fcd34d'
                : '#67e8f9',
            border: `1px solid ${
              msgType === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : msgType === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : msgType === 'warning'
                ? 'rgba(251, 191, 36, 0.3)'
                : 'rgba(0, 229, 255, 0.3)'
            }`,
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ الفرع المكتشف */}
      {detectedBranch && (
        <div
          className="ss-glass"
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRight: '3px solid #00e5ff',
            background:
              'linear-gradient(90deg, rgba(0, 229, 255, 0.08), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>
              {detectedBranch.type === 'main' ? '🏛️' : '🏬'}
            </span>
            <div>
              <div
                style={{
                  color: '#67e8f9',
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                ✅ تم اكتشاف الفرع
              </div>
              <div
                style={{
                  color: '#f8fafc',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {detectedBranch.name}
              </div>
            </div>
          </div>
          {detectedBranch.distance != null && (
            <div
              style={{
                background: 'rgba(0, 229, 255, 0.15)',
                color: '#67e8f9',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              📏 {detectedBranch.distance} متر
            </div>
          )}
        </div>
      )}

      {/* ✅ بطاقات */}
      <div className="grid">
        <GlassCard padding="lg">
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 48,
                marginBottom: 12,
                filter: checkedIn ? 'none' : 'grayscale(0.5)',
              }}
            >
              {checkedIn ? '✅' : '📥'}
            </div>
            <p
              style={{
                color: checkedIn ? '#34d399' : 'rgba(255,255,255,0.85)',
                fontWeight: 800,
                margin: 0,
                fontSize: 18,
              }}
            >
              الحضور
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,0.55)',
                marginTop: 8,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {checkedIn
                ? `تم التسجيل: ${toCairoTime(checkedIn)}`
                : 'لم يتم التسجيل بعد'}
            </p>

            {/* ✅ عرض التحقق */}
            {checkedIn && usedBiometric && (
              <p
                style={{
                  color: '#a78bfa',
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                🔐 تم التحقق بالبصمة
              </p>
            )}
            {checkedIn && !usedBiometric && (
              <p
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                📍 تم التحقق بالموقع فقط
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard padding="lg" variant={checkedOut ? 'neon' : 'glass'}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 48,
                marginBottom: 12,
                filter: checkedOut ? 'none' : 'grayscale(0.5)',
              }}
            >
              {checkedOut ? '✅' : '📤'}
            </div>
            <p
              style={{
                color: checkedOut ? '#a78bfa' : 'rgba(255,255,255,0.85)',
                fontWeight: 800,
                margin: 0,
                fontSize: 18,
              }}
            >
              الانصراف
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,0.55)',
                marginTop: 8,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {checkedOut
                ? `تم التسجيل: ${toCairoTime(checkedOut)}`
                : 'لم يتم التسجيل بعد'}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* ✅ أزرار */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          marginTop: 24,
          flexWrap: 'wrap',
        }}
      >
        <GradientButton
          variant={checkedIn ? 'ghost' : 'success'}
          size="lg"
          fullWidth
          onClick={handleCheckIn}
          disabled={actionLoading || checkedIn}
          style={{ flex: 1, minWidth: 150 }}
        >
          {actionLoading
            ? '⏳'
            : checkedIn
            ? '✅ تم الحضور'
            : biometricAvailable && biometricEnabled
            ? '🔐 تسجيل الحضور بالبصمة'
            : '📥 تسجيل الحضور'}
        </GradientButton>

        <GradientButton
          variant={checkedOut || !checkedIn ? 'ghost' : 'navy'}
          size="lg"
          fullWidth
          onClick={handleCheckOut}
          disabled={actionLoading || !checkedIn || checkedOut}
          style={{ flex: 1, minWidth: 150 }}
        >
          {actionLoading
            ? '⏳'
            : checkedOut
            ? '✅ تم الانصراف'
            : '📤 تسجيل الانصراف'}
        </GradientButton>
      </div>

      {/* ✅ ملاحظة عن البصمة */}
      {biometricAvailable && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: 10,
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
          }}
        >
          💡 {biometricType === 'faceId' ? 'Face ID' : 'بصمة الإصبع'} متاحة على
          جهازك — هتستخدم تلقائياً عند التسجيل
        </div>
      )}

      {!biometricAvailable && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 10,
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
          }}
        >
          📍 سيتم التسجيل بالموقع فقط (البصمة غير متاحة على هذا الجهاز)
        </div>
      )}
    </div>
  );
}