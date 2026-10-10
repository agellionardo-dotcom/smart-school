import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getQueueCount } from '../services/offlineStorage';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const nav = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const loadCount = async () => {
      try {
        const count = await getQueueCount();
        setQueueCount(count);
      } catch (err) {
        console.error(err);
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    if (window.confirm('هل تريد تسجيل الخروج؟')) {
      localStorage.clear();
      nav('/');
    }
  };

  const closeDrawer = () => setDrawerOpen(false);
  const isActive = (path) => location.pathname === path;

  const roleLabels = {
    superadmin: 'المدير العام',
    manager: 'مدير فرع',
    hr: 'موارد بشرية',
    employee: 'موظف',
    viewer: 'مشاهد',
  };

  return (
    <>
      {/* ============ Navbar (Glass) ============ */}
      <nav className="ss-navbar">
        <button
          className="ss-navbar-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-label="فتح القائمة"
        >
          ☰
        </button>
        <div className="ss-navbar-brand">
          <img
            src="/logo.png"
            alt="SMART"
            className="ss-navbar-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h2 className="ss-navbar-title">Smart School</h2>
        </div>

        {/* ✅ زر تبديل الوضع */}
        <div style={{ marginRight: 'auto' }}>
          <ThemeToggle />
        </div>
      </nav>

      {/* ============ Drawer ============ */}
      {drawerOpen && (
        <>
          <div className="ss-drawer-overlay" onClick={closeDrawer}></div>
          <aside className="ss-drawer">
            {/* Header */}
            <div className="ss-drawer-header">
              <img
                src="/logo.png"
                alt="SMART"
                className="ss-drawer-logo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h3>Smart School</h3>
              <p>نظام الحضور والانصراف</p>
            </div>

            {/* User Info */}
            <div className="ss-drawer-user">
              <div className="ss-drawer-user-name">👤 {user.name}</div>
              <div className="ss-drawer-user-role">
                {roleLabels[user.role] || user.role}
              </div>
            </div>

            {/* Menu */}
            <div className="ss-drawer-menu">
              <Link
                to="/dashboard"
                className={`ss-drawer-link ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={closeDrawer}
              >
                <span className="ss-icon">🏠</span>
                <span>الرئيسية</span>
              </Link>

              <Link
                to="/attendance"
                className={`ss-drawer-link ${isActive('/attendance') ? 'active' : ''}`}
                onClick={closeDrawer}
              >
                <span className="ss-icon">📍</span>
                <span>الحضور والانصراف</span>
              </Link>

              <Link
                to="/leaves"
                className={`ss-drawer-link ${isActive('/leaves') ? 'active' : ''}`}
                onClick={closeDrawer}
              >
                <span className="ss-icon">📝</span>
                <span>الإجازات</span>
              </Link>

              <Link
                to="/sync-queue"
                className={`ss-drawer-link ${isActive('/sync-queue') ? 'active' : ''}`}
                onClick={closeDrawer}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span className="ss-icon">🔄</span>
                  <span>المزامنة</span>
                </div>
                {queueCount > 0 && (
                  <span className="ss-badge-count">{queueCount}</span>
                )}
              </Link>

              <div className="ss-drawer-divider"></div>

              <button className="ss-drawer-link ss-logout-btn" onClick={logout}>
                <span className="ss-icon">🚪</span>
                <span>تسجيل الخروج</span>
              </button>
            </div>

            <div className="ss-drawer-footer">
              © 2026 SMART For Computer & Electronics
              <br />
              v2.9
            </div>
          </aside>
        </>
      )}

      {/* ============ Styles ============ */}
      <style>{`
        .ss-navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 20px;
          background: var(--ss-bg-glass, rgba(10, 22, 40, 0.75));
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--ss-border-subtle, rgba(255, 255, 255, 0.08));
          box-shadow: var(--ss-shadow-md, 0 4px 24px rgba(0, 0, 0, 0.2));
          transition: all 0.3s ease;
        }

        .ss-navbar-toggle {
          background: var(--ss-bg-glass, rgba(255, 255, 255, 0.08));
          border: 1px solid var(--ss-border-glass, rgba(255, 255, 255, 0.12));
          color: var(--ss-text-primary, #fff);
          width: 42px;
          height: 42px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .ss-navbar-toggle:hover {
          background: rgba(0, 229, 255, 0.15);
          border-color: rgba(0, 229, 255, 0.4);
        }

        .ss-navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ss-navbar-logo {
          width: 42px;
          height: 42px;
          object-fit: contain;
          border-radius: 10px;
        }
        .ss-navbar-title {
          margin: 0;
          color: var(--ss-text-primary, #fff);
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .ss-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 998;
          animation: ssFadeIn 0.2s ease;
        }

        @keyframes ssFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .ss-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(340px, 88vw);
          z-index: 999;
          background: var(--ss-bg-secondary, rgba(15, 33, 56, 0.92));
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-left: 1px solid var(--ss-border-glass, rgba(255, 255, 255, 0.1));
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          animation: ssSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow-y: auto;
        }

        @keyframes ssSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .ss-drawer-header {
          padding: 24px 20px;
          text-align: center;
          border-bottom: 1px solid var(--ss-border-subtle, rgba(255, 255, 255, 0.08));
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.08), rgba(168, 85, 247, 0.08));
        }
        .ss-drawer-logo {
          width: 70px;
          height: 70px;
          object-fit: contain;
          margin-bottom: 12px;
          border-radius: 14px;
        }
        .ss-drawer-header h3 {
          margin: 0;
          color: var(--ss-text-primary, #fff);
          font-size: 18px;
          font-weight: 700;
        }
        .ss-drawer-header p {
          margin: 4px 0 0;
          color: var(--ss-text-muted, rgba(255, 255, 255, 0.6));
          font-size: 12px;
        }

        .ss-drawer-user {
          padding: 16px 20px;
          background: var(--ss-bg-glass, rgba(0, 0, 0, 0.15));
          border-bottom: 1px solid var(--ss-border-subtle, rgba(255, 255, 255, 0.08));
          text-align: center;
        }
        .ss-drawer-user-name {
          color: var(--ss-text-primary, #fff);
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .ss-drawer-user-role {
          color: #67e8f9;
          font-size: 12px;
          font-weight: 500;
        }

        .ss-drawer-menu {
          flex: 1;
          padding: 12px 0;
          overflow-y: auto;
        }

        .ss-drawer-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          color: var(--ss-text-secondary, rgba(255, 255, 255, 0.85));
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          border-right: 3px solid transparent;
          background: transparent;
          border-top: none;
          border-bottom: none;
          border-left: none;
          font-family: inherit;
          text-align: right;
          width: 100%;
          cursor: pointer;
        }
        .ss-drawer-link:hover {
          background: var(--ss-bg-glass, rgba(255, 255, 255, 0.06));
          color: var(--ss-text-primary, #fff);
        }
        .ss-drawer-link.active {
          background: linear-gradient(90deg, rgba(0, 229, 255, 0.15), transparent);
          border-right-color: #00e5ff;
          color: var(--ss-text-primary, #fff);
        }

        .ss-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .ss-badge-count {
          background: linear-gradient(135deg, #fb923c, #ef4444);
          color: #fff;
          padding: 3px 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          min-width: 22px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(251, 146, 60, 0.4);
        }

        .ss-drawer-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--ss-border-glass, rgba(255, 255, 255, 0.1)), transparent);
          margin: 8px 0;
        }

        .ss-logout-btn {
          color: #fca5a5 !important;
          cursor: pointer;
        }
        .ss-logout-btn:hover {
          background: rgba(239, 68, 68, 0.12) !important;
          color: #fecaca !important;
        }

        .ss-drawer-footer {
          padding: 16px 20px;
          text-align: center;
          color: var(--ss-text-muted, rgba(255, 255, 255, 0.4));
          font-size: 11px;
          border-top: 1px solid var(--ss-border-subtle, rgba(255, 255, 255, 0.06));
          line-height: 1.6;
        }
      `}</style>
    </>
  );
}