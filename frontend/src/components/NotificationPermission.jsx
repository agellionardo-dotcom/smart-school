// ============================================
// Smart School — Notification Permission
// ============================================
// Component بيطلب إذن الإشعارات من المستخدم
// ويظهر حالة الإشعارات
// ============================================

import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  isNotificationSupported,
  requestNotificationPermission,
  getFCMToken,
  onForegroundMessage,
} from '../services/firebase';

export default function NotificationPermission() {
  const [supported, setSupported] = useState(null);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [showBanner, setShowBanner] = useState(false);

  // ============================================
  // ✅ فحص الدعم والإذن
  // ============================================
  useEffect(() => {
    const check = async () => {
      const isSupported = await isNotificationSupported();
      setSupported(isSupported);

      if (!isSupported) return;

      const perm = Notification.permission;
      setPermission(perm);

      // لو الإذن لسه default — أظهر البانر
      if (perm === 'default') {
        // استنى شوية قبل ما نظهر البانر
        setTimeout(() => setShowBanner(true), 3000);
      }

      // لو الإذن granted — سجّل التوكن
      if (perm === 'granted') {
        await registerToken();
      }
    };

    check();
  }, []);

  // ============================================
  // ✅ الاستماع للإشعارات (foreground)
  // ============================================
  useEffect(() => {
    if (permission !== 'granted') return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[Foreground]', payload);
      // هنا ممكن نظهر toast
    });

    return () => unsubscribe && unsubscribe();
  }, [permission]);

  // ============================================
  // ✅ تسجيل التوكن في السيرفر
  // ============================================
  const registerToken = async () => {
    try {
      const result = await getFCMToken();
      if (!result.success) return false;

      await api.post('/notifications/register', {
        fcmToken: result.token,
        platform: getPlatform(),
      });

      setRegistered(true);
      return true;
    } catch (err) {
      console.error('registerToken error:', err);
      return false;
    }
  };

  // ============================================
  // ✅ اكتشاف المنصة
  // ============================================
  const getPlatform = () => {
    if (window.Capacitor?.isNativePlatform?.()) {
      return window.Capacitor.getPlatform(); // android / ios
    }
    return 'web';
  };

  // ============================================
  // ✅ طلب الإذن
  // ============================================
  const handleEnable = async () => {
    setLoading(true);
    setMsg('');

    try {
      const permResult = await requestNotificationPermission();

      if (!permResult.success) {
        setMsg(permResult.error || 'فشل طلب الإذن');
        setMsgType('error');
        setPermission(permResult.permission || 'denied');
        setLoading(false);
        return;
      }

      setPermission('granted');
      const ok = await registerToken();

      if (ok) {
        setMsg('✅ تم تفعيل الإشعارات بنجاح');
        setMsgType('success');
        setShowBanner(false);
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsg('⚠️ تم منح الإذن لكن فشل تسجيل الجهاز');
        setMsgType('warning');
      }
    } catch (err) {
      setMsg('❌ ' + err.message);
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ✅ رفض الإذن — إخفاء البانر مؤقتاً
  // ============================================
  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notif_banner_dismissed', Date.now().toString());
  };

  // ============================================
  // ✅ لو مش مدعوم — مفيش حاجة
  // ============================================
  if (supported === false) return null;

  // ============================================
  // ✅ لو الإذن مرفوض — رسالة ثابتة
  // ============================================
  if (permission === 'denied') {
    return (
      <div className="notif-banner notif-banner-denied">
        <span style={{ fontSize: 20 }}>🔕</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            الإشعارات معطلة
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            لتفعيل الإشعارات، افتح إعدادات المتصفح واسمح بها
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // ✅ لو مفيش حاجة — بانر طلب الإذن
  // ============================================
  if (!showBanner || registered) return null;

  return (
    <>
      <div className="notif-banner">
        <span style={{ fontSize: 24 }}>🔔</span>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>
            فعّل الإشعارات
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
            هنبعتلك تنبيهات الحضور والإعلانات المهمة
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="notif-btn notif-btn-primary"
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? '⏳' : 'تفعيل'}
          </button>
          <button
            className="notif-btn notif-btn-ghost"
            onClick={handleDismiss}
            disabled={loading}
          >
            لاحقاً
          </button>
        </div>
      </div>

      {msg && (
        <div className={`notif-msg notif-msg-${msgType}`}>
          {msg}
        </div>
      )}

      <style>{`
        .notif-banner {
          position: fixed;
          bottom: 90px;
          right: 16px;
          left: 16px;
          max-width: 480px;
          margin: 0 auto;
          padding: 14px 16px;
          background: rgba(15, 33, 56, 0.95);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 24px rgba(0, 229, 255, 0.15);
          display: flex;
          align-items: center;
          gap: 12px;
          color: #f8fafc;
          z-index: 9000;
          direction: rtl;
          animation: notifSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .notif-banner-denied {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        @keyframes notifSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .notif-btn {
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .notif-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .notif-btn-primary {
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          color: #fff;
          box-shadow: 0 4px 16px rgba(0, 229, 255, 0.4);
        }

        .notif-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 229, 255, 0.6);
        }

        .notif-btn-ghost {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .notif-btn-ghost:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.18);
        }

        .notif-msg {
          position: fixed;
          bottom: 20px;
          right: 16px;
          left: 16px;
          max-width: 480px;
          margin: 0 auto;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          z-index: 9001;
          animation: notifSlideUp 0.3s ease;
        }

        .notif-msg-success {
          background: rgba(16, 185, 129, 0.95);
          color: #fff;
        }

        .notif-msg-error {
          background: rgba(239, 68, 68, 0.95);
          color: #fff;
        }

        .notif-msg-warning {
          background: rgba(251, 191, 36, 0.95);
          color: #0a1628;
        }
      `}</style>
    </>
  );
}