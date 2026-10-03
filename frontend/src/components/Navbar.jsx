import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const logout = () => {
    if (window.confirm('هل تريد تسجيل الخروج؟')) {
      localStorage.clear();
      nav('/');
    }
  };

  const closeDrawer = () => setDrawerOpen(false);
  const isActive = (path) => location.pathname === path;

  const canAccessAdmin = ['superadmin', 'manager', 'hr', 'viewer'].includes(user.role);

  const roleLabels = {
    superadmin: 'المدير العام',
    manager: 'مدير فرع',
    hr: 'موارد بشرية',
    employee: 'موظف',
    viewer: 'مشاهد'
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <img
            src="/logo.png"
            alt="SMART"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h2>Smart School</h2>
        </div>
        <button
          className="navbar-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-label="فتح القائمة"
        >
          ☰
        </button>
      </nav>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer}></div>
          <aside className="drawer">
            {/* Header */}
            <div className="drawer-header">
              <img
                src="/logo.png"
                alt="SMART"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h3>Smart School</h3>
              <p>نظام الحضور والانصراف</p>
            </div>

            {/* User Info */}
            <div className="drawer-user">
              <div className="drawer-user-name">👤 {user.name}</div>
              <div className="drawer-user-role">
                {roleLabels[user.role] || user.role}
              </div>
            </div>

            {/* Menu */}
            <div className="drawer-menu">
              <Link
                to="/scan-qr"
                to="/dashboard"
                className={`drawer-link ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={closeDrawer}
              >
                <span className="icon">🏠</span>
                <span>الرئيسية</span>
              </Link>

              <Link
                to="/attendance"
                className={`drawer-link ${isActive('/attendance') ? 'active' : ''}`}
                onClick={closeDrawer}
              >
                <span className="icon">📍</span>
                <span>الحضور والانصراف</span>
              </Link>

              <Link
                to="/leaves"
                className={`drawer-link ${isActive('/leaves') ? 'active' : ''}`}
                onClick={closeDrawer}
              >
                <span className="icon">📝</span>
                <span>الإجازات</span>
              </Link>

              {canAccessAdmin && (
                <>
                  <div className="drawer-divider"></div>
                  <Link
                    to="/admin"
                    className={`drawer-link admin-link ${isActive('/admin') ? 'active' : ''}`}
                    onClick={closeDrawer}
                  >
                    <span className="icon">👑</span>
                    <span>لوحة الإدارة</span>
                  </Link>
                </>
              )}

              <div className="drawer-divider"></div>

              <button
                className="drawer-link"
                onClick={logout}
                style={{ color: '#FF9090' }}
              >
                <span className="icon">🚪</span>
                <span>تسجيل الخروج</span>
              </button>
            </div>

            {/* Footer */}
            <div className="drawer-footer">
              © 2026 SMART For Computer & Electronics
              <br />
              v2.0
            </div>
          </aside>
        </>
      )}
    </>
  );
}