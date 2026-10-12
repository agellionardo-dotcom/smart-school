// frontend/src/pages/Attendance.jsx

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
import FaceEnroll from '../components/FaceEnroll';
import FaceVerify from '../components/FaceVerify';

import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';

export default function Attendance() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [detectedBranch, setDetectedBranch] = useState(null);

  // ✅ حالة البصمة
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  // ✅ حالة Face
  const [faceMode, setFaceMode] = useState(null);
  const [faceEnrolled, setFaceEnrolled] = useState(false);

  // ✅ حالة النطاق الجغرافي
  const [inRange, setInRange] = useState(null);
  const [rangeInfo, setRangeInfo] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  const userRef = useRef(JSON.parse(localStorage.getItem('user') || '{}'));
  const user = userRef.current;

  // ============================================
  // ✅ عرض رسالة
  // ============================================
  const showMsg = useCallback((text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  }, []);

  // ============================================
  // ✅ فحص توفر البصمة
  // ============================================
  const checkBiometric = useCallback(async () => {
    try {
      if (!Capacitor?.isNativePlatform?.()) {
        setBiometricAvailable(false);
        setBiometricType(null);
        return;
      }

      const result = await BiometricAuth.checkBiometry();

      if (result.isAvailable) {
        setBiometricAvailable(true);
        setBiometricType(result.biometryType || 'fingerprint');
      } else {
        setBiometricAvailable(false);
        setBiometricType(null);
      }
    } catch (err) {
      console.error('❌ Biometric error:', err);
      setBiometricAvailable(false);
      setBiometricType(null);
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
  // ✅ التحقق من النطاق الجغرافي
  // ============================================
  const checkRange = useCallback(async () => {
    try {
      setRangeLoading(true);
      const location = await getLocation();

      const { data } = await api.post('/attendance/check-range', {
        lat: location.lat,
        lng: location.lng,
      });

      setInRange(data.inRange);
      setRangeInfo(data);

      return { ...data, location };
    } catch (err) {
      console.warn('Range check error:', err);
      setInRange(null);
      setRangeInfo(null);
      return null;
    } finally {
      setRangeLoading(false);
    }
  }, [getLocation]);

  // ============================================
  // ✅ التحقق بالبصمة
  // ============================================
  const authenticateBiometric = useCallback(
    async (reason) => {
      if (!biometricAvailable) {
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
        return { success: false, used: false, cancelled: true };
      }
    },
    [biometricAvailable]
  );

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
  // ✅ فحص حالة Face
  // ============================================
  const checkFaceStatus = useCallback(async () => {
    try {
      const isConn = await isOnline();
      if (!isConn) return;

      const { data } = await api.get('/face/status');
      setFaceEnrolled(data.faceEnrolled || false);
    } catch (err) {
      console.warn('Face status error:', err);
    }
  }, []);

  // ============================================
  // ✅ useEffect — Initial Load
  // ============================================
  useEffect(() => {
    loadToday();
    loadQueueCount();
    checkBiometric();
    checkFaceStatus();
    checkRange(); // ← فحص النطاق عند التحميل

    const interval = setInterval(loadQueueCount, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // ✅ إعادة فحص النطاق لما يرجع Online
  // ============================================
  useEffect(() => {
    if (online && !loading) {
      checkRange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // ============================================
  // ✅ Face Handlers
  // ============================================
  const handleFaceEnrollSuccess = useCallback(() => {
    setFaceMode(null);
    setFaceEnrolled(true);
    showMsg('✅ تم تسجيل وجهك بنجاح!', 'success');
  }, [showMsg]);

  const handleFaceVerifySuccess = useCallback(
    async (data) => {
      setFaceMode(null);

      // ✅ 1. التحقق من النطاق أولاً
      const rangeCheck = await checkRange();
      if (!rangeCheck?.inRange) {
        showMsg(
          `❌ أنت خارج النطاق (${rangeCheck?.distance || '?'}م) — قرب من الفرع`,
          'error'
        );
        return;
      }

      const location = rangeCheck.location;

      // ✅ 2. المزامنة / الحفظ
      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        const payload = {
          lat: location?.lat,
          lng: location?.lng,
          faceVerified: true,
          faceDistance: data.distance,
          deviceId: user._id,
        };

        try {
          const { data: res } = await api.post('/attendance/checkin', payload);
          setTodayAttendance(res);

          if (res.detectedBranch) {
            setDetectedBranch(res.detectedBranch);
            showMsg(
              `✅ تم التسجيل بالوجه من ${res.detectedBranch.name}`,
              'success'
            );
          } else {
            showMsg('✅ تم تسجيل الحضور بالوجه!', 'success');
          }

          await cacheData('today_attendance', res);
        } catch (err) {
          showMsg(
            '❌ ' + (err.response?.data?.msg || 'فشل تسجيل الحضور'),
            'error'
          );
        }
      } else {
        // ✅ Face في offline — ممنوع، نرفض
        showMsg('❌ Face Recognition يحتاج إنترنت — استخدم البصمة أو GPS', 'error');
      }
    },
    [checkRange, showMsg, user._id]
  );

  // ============================================
  // ✅ تسجيل الحضور
  // ============================================
  const handleCheckIn = useCallback(async () => {
    setActionLoading(true);
    setDetectedBranch(null);
    try {
      // ✅ 1. الموقع
      let location = null;
      try {
        location = await getLocation();
      } catch (err) {
        showMsg('⚠️ فشل الحصول على الموقع: ' + err.message, 'warning');
        return;
      }

      // ✅ 2. التحقق من النطاق (في online فقط)
      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        const rangeCheck = await checkRange();
        if (!rangeCheck?.inRange) {
          showMsg(
            `❌ أنت خارج النطاق (${rangeCheck?.distance || '?'}م) — قرب من الفرع`,
            'error'
          );
          return;
        }
      }

      // ✅ 3. البصمة
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

      // ✅ 4. الحفظ / المزامنة
      if (isConn) {
        const payload = {
          lat: location?.lat,
          lng: location?.lng,
          biometricUsed,
          biometricType: bioType,
          deviceId: user._id,
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
    checkRange,
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
      // ✅ 1. الموقع
      let location = null;
      try {
        location = await getLocation();
      } catch (err) {
        showMsg('⚠️ فشل الحصول على الموقع', 'warning');
        return;
      }

      // ✅ 2. النطاق
      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        const rangeCheck = await checkRange();
        if (!rangeCheck?.inRange) {
          showMsg(
            `❌ أنت خارج النطاق (${rangeCheck?.distance || '?'}م) — قرب من الفرع`,
            'error'
          );
          return;
        }
      }

      // ✅ 3. البصمة
      let biometricUsed = false;
      let bioType = null;

      if (biometricAvailable && biometricEnabled) {
        const bio = await authenticateBiometric('سجّل انصرافك');
        biometricUsed = bio.used;
        bioType = bio.used ? biometricType : null;
      }

      // ✅ 4. الحفظ
      if (isConn) {
        const payload = {
          lat: location?.lat,
          lng: location?.lng,
          biometricUsed,
          biometricType: bioType,
          deviceId: user._id,
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
    checkRange,
    loadQueueCount,
    showMsg,
    user._id,
    biometricAvailable,
    biometricEnabled,
    biometricType,
    authenticateBiometric,
  ]);

  if (loading) {
    return (
      <div className="dashboard">
        <GlassCard padding="lg">
          <p
            style={{
              textAlign: 'center',
              color: 'var(--ss-text-muted)',
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
  const usedFace = todayAttendance?.verification?.faceVerified;

  return (
    <div className="dashboard">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            marginBottom: 8,
            fontSize: 28,
            fontWeight: 800,
            background: 'var(--ss-grad-primary)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          📍 الحضور والانصراف
        </h1>
        <p style={{ color: 'var(--ss-text-secondary)', margin: 0, fontSize: 14 }}>
          الفرع: {user.branch?.name || 'غير محدد'}
        </p>
      </div>

      {/* ✅ حالة الشبكة + البصمة + النطاق */}
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
          {biometricAvailable && (
            <button
              onClick={() => setBiometricEnabled(!biometricEnabled)}
              style={{
                background: biometricEnabled
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'var(--ss-bg-surface)',
                color: biometricEnabled ? '#a78bfa' : 'var(--ss-text-muted)',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                border: `1px solid ${
                  biometricEnabled
                    ? 'rgba(168, 85, 247, 0.3)'
                    : 'var(--ss-border-subtle)'
                }`,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
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
              }}
            >
              ⏳ {queueCount}
            </span>
          )}
        </div>
      </div>

      {/* ✅ حالة النطاق الجغرافي */}
      {online && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            background:
              inRange === true
                ? 'rgba(16, 185, 129, 0.1)'
                : inRange === false
                ? 'rgba(239, 68, 68, 0.1)'
                : 'var(--ss-bg-surface)',
            border: `1px solid ${
              inRange === true
                ? 'rgba(16, 185, 129, 0.3)'
                : inRange === false
                ? 'rgba(239, 68, 68, 0.3)'
                : 'var(--ss-border-subtle)'
            }`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color:
                inRange === true
                  ? '#34d399'
                  : inRange === false
                  ? '#fca5a5'
                  : 'var(--ss-text-muted)',
            }}
          >
            {rangeLoading ? (
              <>⏳ جاري التحقق من الموقع...</>
            ) : inRange === true ? (
              <>✅ داخل نطاق {rangeInfo?.branchName || 'الفرع'}</>
            ) : inRange === false ? (
              <>❌ خارج النطاق — {rangeInfo?.distance}م</>
            ) : (
              <>📍 لم يتم التحقق من النطاق</>
            )}
          </div>

          <button
            onClick={checkRange}
            disabled={rangeLoading}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--ss-bg-surface)',
              color: 'var(--ss-text-primary)',
              fontSize: 11,
              fontWeight: 700,
              border: '1px solid var(--ss-border-glass)',
              cursor: rangeLoading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            🔄 فحص
          </button>
        </div>
      )}

      {/* رسالة */}
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
          }}
        >
          {msg}
        </div>
      )}

      {/* الفرع المكتشف */}
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
              <div style={{ color: 'var(--ss-text-accent)', fontSize: 13, fontWeight: 700 }}>
                ✅ تم اكتشاف الفرع
              </div>
              <div style={{ color: 'var(--ss-text-primary)', fontSize: 14, fontWeight: 600 }}>
                {detectedBranch.name}
              </div>
            </div>
          </div>
          {detectedBranch.distance != null && (
            <div
              style={{
                background: 'rgba(0, 229, 255, 0.15)',
                color: 'var(--ss-text-accent)',
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

      {/* بطاقات */}
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
                color: checkedIn ? '#34d399' : 'var(--ss-text-primary)',
                fontWeight: 800,
                margin: 0,
                fontSize: 18,
              }}
            >
              الحضور
            </p>
            <p
              style={{
                color: 'var(--ss-text-muted)',
                marginTop: 8,
                fontSize: 13,
              }}
            >
              {checkedIn
                ? `تم التسجيل: ${toCairoTime(checkedIn)}`
                : 'لم يتم التسجيل بعد'}
            </p>

            {checkedIn && usedFace && (
              <p
                style={{
                  color: '#67e8f9',
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                👤 تم التحقق بالوجه
              </p>
            )}
            {checkedIn && usedBiometric && !usedFace && (
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
            {checkedIn && !usedBiometric && !usedFace && (
              <p
                style={{
                  color: 'var(--ss-text-muted)',
                  marginTop: 6,
                  fontSize: 11,
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
                color: checkedOut ? '#a78bfa' : 'var(--ss-text-primary)',
                fontWeight: 800,
                margin: 0,
                fontSize: 18,
              }}
            >
              الانصراف
            </p>
            <p
              style={{
                color: 'var(--ss-text-muted)',
                marginTop: 8,
                fontSize: 13,
              }}
            >
              {checkedOut
                ? `تم التسجيل: ${toCairoTime(checkedOut)}`
                : 'لم يتم التسجيل بعد'}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* أزرار الحضور/الانصراف */}
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
          {actionLoading ? '⏳' : checkedOut ? '✅ تم الانصراف' : '📤 تسجيل الانصراف'}
        </GradientButton>
      </div>

      {/* ✅ زر Face Recognition — Online فقط */}
      {online && !checkedIn && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setFaceMode(faceEnrolled ? 'verify' : 'enroll')}
            disabled={actionLoading}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 14,
              border: '1px solid rgba(0, 229, 255, 0.4)',
              background:
                'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(168,85,247,0.15))',
              color: 'var(--ss-text-accent)',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.3s',
            }}
          >
            <span style={{ fontSize: 20 }}>👤</span>
            <span>
              {faceEnrolled
                ? 'تسجيل الحضور بالوجه'
                : 'سجّل وجهك أولاً (Face Recognition)'}
            </span>
          </button>
        </div>
      )}

      {/* ✅ تنبيه: Face غير متاح في Offline */}
      {!online && !checkedIn && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: 12,
            fontSize: 13,
            color: '#fcd34d',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          📴 وضع Offline — Face Recognition يحتاج إنترنت
          <br />
          <span style={{ fontSize: 11, opacity: 0.8 }}>
            استخدم البصمة أو GPS
          </span>
        </div>
      )}

      {/* ✅ Face Modal */}
      {faceMode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            direction: 'rtl',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFaceMode(null);
          }}
        >
          <div style={{ width: '100%', maxWidth: 480 }}>
            {faceMode === 'enroll' && (
              <FaceEnroll
                onSuccess={handleFaceEnrollSuccess}
                onCancel={() => setFaceMode(null)}
              />
            )}
            {faceMode === 'verify' && (
              <FaceVerify
                onSuccess={handleFaceVerifySuccess}
                onCancel={() => setFaceMode(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* ملاحظة عن البصمة */}
      {biometricAvailable && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--ss-text-secondary)',
            textAlign: 'center',
          }}
        >
          💡 {biometricType === 'faceId' ? 'Face ID' : 'بصمة الإصبع'} متاحة على
          جهازك — هتستخدم تلقائياً عند التسجيل
        </div>
      )}

      {!biometricAvailable && online && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: 'var(--ss-bg-surface)',
            border: '1px solid var(--ss-border-subtle)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--ss-text-muted)',
            textAlign: 'center',
          }}
        >
          📍 سيتم التسجيل بالموقع فقط (البصمة غير متاحة على هذا المتصفح)
        </div>
      )}
    </div>
  );
}