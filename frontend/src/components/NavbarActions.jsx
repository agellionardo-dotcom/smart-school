// frontend/src/components/NavbarActions.jsx

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function NavbarActions() {
  const nav = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canAccessAdmin = ['superadmin', 'manager', 'hr'].includes(user.role);

  const path = location.pathname;
  const isDashboard = path === '/dashboard';
  const isAdmin = path.startsWith('/admin');
  const isAuthPage = ['/', '/forgot-password', '/reset-password'].includes(path);

  // ✅ إظهار زر الإدارة في Dashboard فقط
  const showAdmin = isDashboard && canAccessAdmin;

  // ✅ إظهار زر العودة في كل الأقسام الداخلية + Admin
  const showBack = !isAuthPage && !isDashboard;

  if (isAuthPage) return null;

  return (
    <div className="ss-navbar-actions">
      {showAdmin && (
        <button
          onClick={() => nav('/admin')}
          className="ss-navbar-action-btn ss-action-admin"
          title="لوحة الإدارة"
          aria-label="لوحة الإدارة"
        >
          <span className="ss-navbar-action-icon">👑</span>
          <span className="ss-navbar-action-label">الإدارة</span>
        </button>
      )}

      {showBack && (
        <button
          onClick={() => nav(isAdmin ? '/dashboard' : -1)}
          className="ss-navbar-action-btn ss-action-back"
          title="رجوع"
          aria-label="رجوع"
        >
          <span className="ss-navbar-action-icon">←</span>
          <span className="ss-navbar-action-label">عودة</span>
        </button>
      )}

      <style>{`
        .ss-navbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 8px;
        }

        .ss-navbar-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 40px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          white-space: nowrap;
        }

        .ss-navbar-action-btn:active {
          transform: scale(0.96);
        }

        .ss-navbar-action-icon {
          font-size: 16px;
          line-height: 1;
          font-weight: 700;
        }

        .ss-navbar-action-label {
          letter-spacing: 0.3px;
        }

        /* ✅ زر الإدارة */
        .ss-action-admin {
          background: linear-gradient(135deg, #0a1f44 0%, #142b5c 100%);
          color: #fff;
          box-shadow: 0 4px 14px rgba(10, 31, 68, 0.4);
        }

        .ss-action-admin:hover {
          background: linear-gradient(135deg, #00e5ff 0%, #a855f7 100%);
          border-color: rgba(0, 229, 255, 0.5);
          box-shadow: 0 6px 20px rgba(0, 229, 255, 0.5);
          transform: translateY(-2px);
        }

        /* ✅ زر العودة */
        .ss-action-back {
          background: rgba(255, 255, 255, 0.06);
          color: #f8fafc;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .ss-action-back:hover {
          background: rgba(0, 229, 255, 0.15);
          border-color: rgba(0, 229, 255, 0.4);
          box-shadow: 0 6px 20px rgba(0, 229, 255, 0.3);
          transform: translateY(-2px);
        }

        .ss-action-back .ss-navbar-action-icon {
          transition: transform 0.3s;
        }

        .ss-action-back:hover .ss-navbar-action-icon {
          transform: translateX(-3px);
        }

        /* ✅ Responsive */
        @media (max-width: 640px) {
          .ss-navbar-action-label {
            display: none;
          }
          .ss-navbar-action-btn {
            width: 40px;
            padding: 0;
            justify-content: center;
            border-radius: 50%;
          }
          .ss-navbar-action-icon {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}