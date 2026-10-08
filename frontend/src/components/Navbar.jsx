import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
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

  // ✅ تبويبات لوحة الإدارة
  const adminTabs = [
    { id: 'overview',      label: '📊 نظرة عامة',      roles: ['superadmin', 'manager', 'hr'] },
    { id: 'analytics',     label: '📈 التحليلات',      roles: ['superadmin', 'manager', 'hr'] },
    { id: 'emergency',     label: '🚨 الطوارئ',        roles: ['superadmin', 'manager', 'hr'] },
    { id: 'announcements', label: '📢 الإعلانات',      roles: ['superadmin', 'manager', 'hr'] },
    { id: 'payroll',       label: '💰 المرتبات',       roles: ['superadmin', 'hr'] },
    { id: 'reports',       label: '📊 التقارير',       roles: ['superadmin', 'manager', 'hr'] },
    { id: 'organization',  label: '📄 الهيكل التنظيمي',  roles: ['superadmin', 'manager', 'hr'] },
    { id: 'users',         label: '👥 المستخدمون',     roles: ['superadmin', 'hr'] },
    { id: 'branches',      label: '🏢 الفروع',         roles: ['superadmin'] },
    { id: 'map',           label: '🗺️ الخريطة',        roles: ['superadmin', 'manager', 'hr', 'viewer'] },
    { id: 'qr',            label: '📱 QR Code',        roles: ['superadmin', 'manager'] },
    { id: 'settings',      label: '⚙️ الإعدادات',      roles: ['superadmin'] },
  ];

  const allowedAdminTabs = adminTabs.filter(t => t.roles.includes(user.role));

  return (
    <>
      {/* Navbar — ✅ معكوس: القايمة على الشمال، الشعار على اليمين */}
      <nav className="navbar">
        <button
          className="navbar-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-label="فتح القائمة"
        >
          ☰
        </button>
        <div className="navbar-brand">
          <img
            src="/logo.png"
            alt="SMART"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h2>Smart School</h2>
        </div>
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

                  {/* ✅ لوحة الإدارة - قائمة فرعية */}
                  <div>
                    <button
                      onClick={() => setAdminOpen(!adminOpen)}
                      className={`drawer-link admin-link ${isActive('/admin') ? 'active' : ''}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span className="icon">👑</span>
                        <span>لوحة الإدارة</span>
                      </div>
                      <span style={{
                        fontSize: 10,
                        transition: 'transform 0.2s',
                        transform: adminOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                      }}>
                        ▶
                      </span>
                    </button>

                    {adminOpen && (
                      <div style={{
                        background: 'rgba(0,0,0,0.15)',
                        padding: '4px 0',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        {allowedAdminTabs.map(t => (
                          <Link
                            key={t.id}
                            to={`/admin?tab=${t.id}`}
                            onClick={closeDrawer}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '10px 24px 10px 50px',
                              color: '#fff',
                              textDecoration: 'none',
                              fontSize: 13,
                              opacity: 0.85,
                              transition: 'all 0.2s',
                              borderRight: '3px solid transparent',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                              e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.opacity = '0.85';
                            }}
                          >
                            {t.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
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