// ============================================
// Smart School — Install PWA Button
// ============================================
// ✅ الإصدار 2.0
// - يظهر أسفل الصفحة
// - يختفي لو بانر الإشعارات ظاهر
// - تصميم متراصف على الموبايل
// ============================================

import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa_install_dismissed';
const NOTIF_BANNER_CHECK_INTERVAL = 500; // كل نص ثانية

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [notifBannerVisible, setNotifBannerVisible] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);

  // ============================================
  // ✅ هل التطبيق مثبت بالفعل؟
  // ============================================
  const isStandalone = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  };

  // ============================================
  // ✅ مراقبة بانر الإشعارات
  // ============================================
  useEffect(() => {
    const checkNotifBanner = () => {
      const banner = document.querySelector('.notif-banner');
      if (banner) {
        const isVisible = banner.offsetHeight > 0 && 
                         window.getComputedStyle(banner).display !== 'none';
        setNotifBannerVisible(isVisible);
      } else {
        setNotifBannerVisible(false);
      }
    };

    checkNotifBanner();
    const interval = setInterval(checkNotifBanner, NOTIF_BANNER_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // ✅ useEffect — إعداد الأحداث
  // ============================================
  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    const handleInstalled = () => {
      console.log('[PWA] ✅ App installed');
      setInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    if (isIOS) {
      setShowButton(true);
    }

    let timeoutId;
    if (isAndroid) {
      timeoutId = setTimeout(() => {
        if (!deferredPrompt && !isStandalone()) {
          setShowButton(true);
        }
      }, 15000); // 15 ثانية بدل 10
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // ✅ handleInstall
  // ============================================
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);

      if (outcome === 'accepted') {
        setShowButton(false);
      }
      setDeferredPrompt(null);
      return;
    }
    setShowInstructions(true);
  };

  const handleDismiss = () => {
    setShowButton(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  // ============================================
  // ✅ ما نعرضش لو:
  // - مثبت بالفعل
  // - الزر مش مطلوب
  // - 🔑 بانر الإشعارات ظاهر (لتجنب التعارض)
  // ============================================
  if (installed) return null;
  if (!showButton) return null;
  if (notifBannerVisible) return null;  // ← ✅ المهم

  return (
    <>
      <div className="pwa-install-banner">
        <div className="pwa-install-icon">📱</div>
        <div className="pwa-install-content">
          <div className="pwa-install-title">ثبّت التطبيق</div>
          <div className="pwa-install-subtitle">
            افتحه من الشاشة الرئيسية
          </div>
        </div>
        <div className="pwa-install-actions">
          <button className="pwa-btn pwa-btn-primary" onClick={handleInstall}>
            تثبيت
          </button>
          <button
            className="pwa-btn pwa-btn-ghost"
            onClick={handleDismiss}
            aria-label="إخفاء"
          >
            ✖
          </button>
        </div>
      </div>

      {showInstructions && (
        <div
          className="pwa-modal-overlay"
          onClick={() => setShowInstructions(false)}
        >
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <h3>📱 تثبيت التطبيق</h3>
              <button
                className="pwa-modal-close"
                onClick={() => setShowInstructions(false)}
              >
                ✖
              </button>
            </div>

            <div className="pwa-modal-body">
              {!isIOS && (
                <div className="pwa-instruction-section">
                  <h4>🌐 في Chrome:</h4>
                  <ol>
                    <li>اضغط على <strong>⋮</strong> (القائمة)</li>
                    <li>اختر <strong>"تثبيت التطبيق"</strong></li>
                    <li>أو <strong>"Install app"</strong></li>
                  </ol>
                </div>
              )}

              {isIOS && (
                <div className="pwa-instruction-section">
                  <h4>📱 في iPhone / iPad (Safari):</h4>
                  <ol>
                    <li>اضغط زر <strong>المشاركة</strong> ⬆️</li>
                    <li>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></li>
                    <li>اضغط <strong>"إضافة"</strong></li>
                  </ol>
                </div>
              )}

              <div className="pwa-instruction-note">
                💡 بعد التثبيت، هيظهر التطبيق على شاشتك زي أي تطبيق تاني.
              </div>
            </div>

            <div className="pwa-modal-footer">
              <button
                className="pwa-btn pwa-btn-primary"
                onClick={() => setShowInstructions(false)}
              >
                تمام
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pwa-install-banner {
          position: fixed;
          bottom: 20px;         /* ← بدل 90px — بس لوحده */
          right: 16px;
          left: 16px;
          max-width: 480px;
          margin: 0 auto;
          padding: 12px 14px;
          background: rgba(15, 33, 56, 0.95);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 24px rgba(0, 229, 255, 0.15);
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f8fafc;
          z-index: 8999;
          direction: rtl;
          animation: pwaSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pwa-install-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .pwa-install-content {
          flex: 1;
          text-align: right;
          min-width: 0;
        }

        .pwa-install-title {
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 1px;
        }

        .pwa-install-subtitle {
          font-size: 10px;
          opacity: 0.7;
          line-height: 1.3;
        }

        .pwa-install-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .pwa-btn {
          padding: 7px 12px;
          border-radius: 9px;
          border: none;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .pwa-btn-primary {
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          color: #fff;
          box-shadow: 0 4px 16px rgba(0, 229, 255, 0.4);
        }

        .pwa-btn-ghost {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 7px 9px;
        }

        .pwa-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .pwa-modal {
          background: #0f2138;
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 16px;
          width: 100%;
          max-width: 460px;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          direction: rtl;
        }

        .pwa-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 229, 255, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pwa-modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #f8fafc;
        }

        .pwa-modal-close {
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          opacity: 0.7;
        }

        .pwa-modal-body {
          padding: 20px;
          overflow-y: auto;
          color: #f8fafc;
        }

        .pwa-instruction-section {
          margin-bottom: 20px;
        }

        .pwa-instruction-section h4 {
          font-size: 15px;
          margin: 0 0 10px;
          color: #00e5ff;
        }

        .pwa-instruction-section ol {
          margin: 0;
          padding-right: 20px;
          padding-left: 0;
          line-height: 1.8;
          font-size: 13px;
        }

        .pwa-instruction-section ol li {
          margin-bottom: 6px;
          opacity: 0.9;
        }

        .pwa-instruction-section ol li strong {
          color: #00e5ff;
          font-weight: 700;
        }

        .pwa-instruction-note {
          padding: 12px;
          background: rgba(0, 229, 255, 0.08);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.6;
        }

        .pwa-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid rgba(0, 229, 255, 0.15);
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </>
  );
}