import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminFloatingButton() {
  const [visible, setVisible] = useState(false);
  const [pulse, setPulse] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ✅ الصلاحيات — يظهر للمدير/HR/manager
  const canAccessAdmin = ['superadmin', 'manager', 'hr'].includes(user.role);

  // ✅ إخفاء في صفحات Login/Register + Admin نفسه
  const isAuthPage = ['/', '/forgot-password', '/reset-password'].some(
    (p) => location.pathname.startsWith(p)
  );
  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    // ✅ يظهر في صفحات معينة فقط
    setVisible(canAccessAdmin && !isAuthPage && !isAdminPage);
  }, [canAccessAdmin, isAuthPage, isAdminPage]);

  // ✅ أنيميشن نبض كل 5 ثواني
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
    }, 8000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <button
        onClick={() => nav('/admin')}
        className={`ss-admin-float ${pulse ? 'pulse' : ''}`}
        title="لوحة الإدارة"
        aria-label="لوحة الإدارة"
      >
        <span className="ss-admin-float-icon">👑</span>
        <span className="ss-admin-float-label">الإدارة</span>
      </button>

      <style>{`
        .ss-admin-float {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 9998;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;

          width: 68px;
          height: 68px;
          border-radius: 50%;
          border: none;

          background: linear-gradient(135deg, #0a1f44 0%, #142b5c 100%);
          color: #fff;
          cursor: pointer;

          box-shadow:
            0 6px 20px rgba(10, 31, 68, 0.5),
            0 0 0 0 rgba(0, 229, 255, 0.4);

          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          font-family: inherit;
          overflow: hidden;
        }

        .ss-admin-float::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          opacity: 0;
          z-index: -1;
          transition: opacity 0.3s;
        }

        .ss-admin-float:hover {
          transform: scale(1.1) translateY(-4px);
          box-shadow:
            0 10px 30px rgba(0, 229, 255, 0.6),
            0 0 0 8px rgba(0, 229, 255, 0.1);
        }

        .ss-admin-float:hover::before {
          opacity: 1;
        }

        .ss-admin-float:active {
          transform: scale(1.05) translateY(-2px);
        }

        .ss-admin-float-icon {
          font-size: 26px;
          line-height: 1;
          filter: drop-shadow(0 2px 4px rgba(0, 229, 255, 0.5));
        }

        .ss-admin-float-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          opacity: 0.9;
        }

        /* ✅ نبض */
        .ss-admin-float.pulse {
          animation: ssAdminPulse 2s ease-in-out;
        }

        @keyframes ssAdminPulse {
          0%, 100% {
            box-shadow:
              0 6px 20px rgba(10, 31, 68, 0.5),
              0 0 0 0 rgba(0, 229, 255, 0.4);
          }
          50% {
            box-shadow:
              0 6px 30px rgba(0, 229, 255, 0.7),
              0 0 0 12px rgba(0, 229, 255, 0);
          }
        }

        /* ✅ Mobile */
        @media (max-width: 480px) {
          .ss-admin-float {
            width: 60px;
            height: 60px;
            bottom: 16px;
            left: 16px;
          }
          .ss-admin-float-icon {
            font-size: 22px;
          }
          .ss-admin-float-label {
            font-size: 8px;
          }
        }

        /* ✅ إخفاء الـ Label في الشاشات الصغيرة جداً */
        @media (max-width: 360px) {
          .ss-admin-float-label {
            display: none;
          }
        }
      `}</style>
    </>
  );
}