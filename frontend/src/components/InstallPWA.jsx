// ============================================
// Smart School — Install PWA Button
// ============================================
// زر تثبيت التطبيق (PWA)
// - يظهر لما يكون التطبيق قابل للتثبيت
// - لو مش قابل للتثبيت → يظهر تعليمات يدوية
// - يختفي بعد التثبيت
// ============================================

import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa_install_dismissed';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);

  // ============================================
  // ✅ كشف المنصة
  // ============================================
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
  // ✅ useEffect — إعداد الأحداث
  // ============================================
  useEffect(() => {
    // لو مثبت بالفعل — ما نظهرش الزر
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // لو المستخدم رفض التثبيت قبل كده — ما نظهرش الزر
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      // نعرضه تاني بعد 7 أيام
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // ✅ نستمع لحدث beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    // ✅ نستمع لحدث appinstalled
    const handleInstalled = () => {
      console.log('[PWA] ✅ App installed');
      setInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // ✅ لو iOS — نعرض الزر يدويًا (لأن iOS مش بيدعم beforeinstallprompt)
    if (isIOS) {
      setShowButton(true);
    }

    // ✅ لو Android — بعد 10 ثواني، نعرض الزر يدويًا لو الظروف مناسبة
    let timeoutId;
    if (isAndroid) {
      timeoutId = setTimeout(() => {
        if (!deferredPrompt && !isStandalone()) {
          setShowButton(true);
        }
      }, 10000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // ✅ handleInstall — لما المستخدم يضغط الزر
  // ============================================
  const handleInstall = async () => {
    // ✅ لو beforeinstallprompt متاح → استخدمه
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);

      if (outcome === 'accepted') {
        console.log('[PWA] ✅ User accepted');
        setShowButton(false);
      } else {
        console.log('[PWA] User dismissed');
      }

      setDeferredPrompt(null);
      return;
    }

    // ✅ fallback — نعرض تعليمات يدوية
    setShowInstructions(true);
  };

  // ============================================
  // ✅ handleDismiss — لما المستخدم يرفض الزر
  // ============================================
  const handleDismiss = () => {
    setShowButton(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  // ============================================
  // ✅ ما نعرضش حاجة لو:
  // ============================================
  if (installed) return null;         // مثبت بالفعل
  if (!showButton) return null;       // الزر مش ظاهر

  // ============================================
  // ✅ Render
  // ============================================
  return (
    <>
      {/* ✅ زر التثبيت */}
      <div className="pwa-install-banner">
        <div className="pwa-install-icon">📱</div>
        <div className="pwa-install-content">
          <div className="pwa-install-title">ثبّت التطبيق</div>
          <div className="pwa-install-subtitle">
            افتحه من الشاشة الرئيسية — بدون متصفح
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

      {/* ✅ Modal التعليمات اليدوية */}
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
              {/* ✅ Chrome / Edge */}
              {!isIOS && (
                <>
                  <div className="pwa-instruction-section">
                    <h4>🌐 في Chrome أو Edge:</h4>
                    <ol>
                      <li>
                        اضغط على <strong>⋮</strong> (القائمة) في أعلى المتصفح
                      </li>
                      <li>
                        اختر <strong>"تثبيت التطبيق"</strong> أو{' '}
                        <strong>"Install app"</strong>
                      </li>
                      <li>
                        أو ابحث في <strong>الإعدادات</strong> →{' '}
                        <strong>Apps</strong> →{' '}
                        <strong>Install this site as an app</strong>
                      </li>
                    </ol>
                  </div>
                </>
              )}

              {/* ✅ iOS (Safari) */}
              {isIOS && (
                <div className="pwa-instruction-section">
                  <h4>📱 في iPhone / iPad:</h4>
                  <ol>
                    <li>
                      اضغط على زر <strong>المشاركة</strong> ⬆️ في الأسفل
                    </li>
                    <li>
                      دوّر على <strong>"إضافة إلى الشاشة الرئيسية"</strong>
                    </li>
                    <li>
                      اضغط <strong>"إضافة"</strong>
                    </li>
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

      {/* ============================================ */}
      {/* ✅ Styles */}
      {/* ============================================ */}
      <style>{`
        .pwa-install-banner {
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
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 24px rgba(0, 229, 255, 0.15);
          display: flex;
          align-items: center;
          gap: 12px;
          color: #f8fafc;
          z-index: 8999;
          direction: rtl;
          animation: pwaSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes pwaSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .pwa-install-icon {
          font-size: 28px;
          flex-shrink: 0;
        }

        .pwa-install-content {
          flex: 1;
          text-align: right;
        }

        .pwa-install-title {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .pwa-install-subtitle {
          font-size: 11px;
          opacity: 0.75;
          line-height: 1.4;
        }

        .pwa-install-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .pwa-btn {
          padding: 8px 14px;
          border-radius: 10px;
          border: none;
          font-family: inherit;
          font-size: 13px;
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

        .pwa-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 229, 255, 0.6);
        }

        .pwa-btn-ghost {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 8px 10px;
        }

        .pwa-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        /* Modal */
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
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
          animation: pwaSlideUp 0.3s ease;
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
          transition: opacity 0.2s;
        }

        .pwa-modal-close:hover {
          opacity: 1;
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
          opacity: 0.9;
        }

        .pwa-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid rgba(0, 229, 255, 0.15);
          display: flex;
          justify-content: flex-end;
        }

        /* Mobile adjustments */
        @media (max-width: 480px) {
          .pwa-install-banner {
            bottom: 80px;
          }
        }
      `}</style>
    </>
  );
}