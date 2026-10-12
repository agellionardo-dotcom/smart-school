// frontend/src/components/BackFloatingButton.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BackFloatingButton() {
  const [visible, setVisible] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  // ✅ الصفحات اللي يظهر فيها زر العودة (Sub-pages فقط)
  const BACK_PAGES = ['/attendance', '/leaves', '/scan-qr', '/sync-queue', '/employee'];

  useEffect(() => {
    const shouldShow = BACK_PAGES.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + '/')
    );
    setVisible(shouldShow);
  }, [location.pathname]);

  const handleBack = () => {
    // ✅ لو فيه history، ارجع للصفحة السابقة
    if (window.history.length > 2) {
      nav(-1);
    } else {
      // ✅ fallback: روح Dashboard
      nav('/dashboard');
    }
  };

  if (!visible) return null;

  return (
    <>
      <button
        onClick={handleBack}
        className="ss-back-float"
        title="رجوع"
        aria-label="رجوع"
      >
        <span className="ss-back-float-arrow">←</span>
        <span className="ss-back-float-label">عودة</span>
      </button>

      <style>{`
        .ss-back-float {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 9998;

          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 8px;

          height: 56px;
          padding: 0 20px;
          border-radius: 28px;
          border: none;

          background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%);
          color: #fff;
          cursor: pointer;

          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);

          box-shadow:
            0 6px 20px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.08);

          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          font-family: inherit;
        }

        .ss-back-float:hover {
          transform: translateY(-4px) scale(1.05);
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%);
          box-shadow:
            0 10px 30px rgba(0, 229, 255, 0.5),
            0 0 0 1px rgba(0, 229, 255, 0.4);
        }

        .ss-back-float:active {
          transform: translateY(-2px) scale(1.02);
        }

        .ss-back-float-arrow {
          font-size: 22px;
          line-height: 1;
          font-weight: 700;
          transition: transform 0.3s;
        }

        .ss-back-float:hover .ss-back-float-arrow {
          transform: translateX(-4px);
        }

        .ss-back-float-label {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        @media (max-width: 480px) {
          .ss-back-float {
            height: 50px;
            padding: 0 16px;
            bottom: 16px;
            left: 16px;
          }
          .ss-back-float-arrow {
            font-size: 20px;
          }
          .ss-back-float-label {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}