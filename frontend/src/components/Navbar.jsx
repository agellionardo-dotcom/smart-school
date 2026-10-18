// 📁 frontend/src/components/Navbar.jsx
// ⬅️ استبدل الملف بالكامل

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getQueueCount } from '../services/offlineStorage';
import ThemeToggle from './ThemeToggle';
import NavbarActions from './NavbarActions';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const nav = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ✅ تحديد الصلاحيات
  const isSuperAdmin = user.role === 'superadmin';
  const isCompanyOwner = user.companyRole === 'company_owner';
  const isImpersonating = !!user.isImpersonating;

  // ✅ القائمة العادية تظهر لو:
  // 1. موظف عادي (مش superadmin ومش company_owner)
  // 2. أو superadmin داخل شركة (impersonating)
  const showRegularMenu = !isSuperAdmin && !isCompanyOwner || isImpersonating;

  // ✅ تاب "لوحة الإدارة" يظهر لو:
  // 1. superadmin (المنصة)
  // 2. company_owner (مدير شركة)
  // 3. impersonating (سوبر أدمن داخل شركة)
  const showAdminTab = isSuperAdmin || isCompanyOwner || isImpersonating;

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

  const handleExitImpersonate = () => {
    if (!window.confirm(`🚪 هل تريد الخروج من شركة "${user.companyName || ''}" والعودة لـ SuperAdmin؟`)) return;

    const originalToken = localStorage.getItem('originalToken');
    const originalUser = localStorage.getItem('originalUser');

    if (originalToken && originalUser) {
      localStorage.setItem('token', originalToken);
      localStorage.setItem('user', originalUser);
    }

    localStorage.removeItem('originalToken');
    localStorage.removeItem('originalUser');
    window.location.href = '/superadmin';
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
      {/* ============ Navbar ============ */}
      <nav className="ss-navbar">
        <button className="ss-navbar-toggle" onClick={() => setDrawerOpen(true)}>☰</button>
        <div className="ss-navbar-brand">
          <img src="/nabd-icon.png" alt="Nabd" className="ss-navbar-logo" onError={(e) => { e.target.style.display = 'none'; }} />
          <h2 className="ss-navbar-title">Nabd</h2>
        </div>

        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* ✅ زر SuperAdmin (للسوبر أدمن بس) */}
          {isSuperAdmin && !isImpersonating && (
            <Link to="/superadmin" className="ss-superadmin-btn" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(168, 85, 247, 0.15))',
              border: '1px solid rgba(168, 85, 247, 0.4)', color: '#a855f7', fontWeight: 700, fontSize: 13,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              👑 <span className="ss-superadmin-text">SuperAdmin</span>
            </Link>
          )}

          {/* ✅ زر الخروج من الشركة (لما impersonating) */}
          {isImpersonating && (
            <button onClick={handleExitImpersonate} className="ss-exit-impersonate-btn" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(239, 68, 68, 0.2))',
              border: '1px solid rgba(251, 146, 60, 0.5)', color: '#fb923c', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              🚪 <span className="ss-exit-impersonate-text">خروج من {user.companyName || 'الشركة'}</span>
            </button>
          )}

          <NavbarActions />
          <ThemeToggle />
        </div>
      </nav>

      {/* ============ Drawer ============ */}
      {drawerOpen && (
        <>
          <div className="ss-drawer-overlay" onClick={closeDrawer}></div>
          <aside className="ss-drawer">
            <div className="ss-drawer-header">
              <img src="/nabd-icon.png" alt="Nabd" className="ss-drawer-logo" onError={(e) => { e.target.style.display = 'none'; }} />
              <h3>Nabd</h3>
              <p>نبض شركتك</p>
            </div>

            <div className="ss-drawer-user">
              <div className="ss-drawer-user-name">👤 {user.name}</div>
              <div className="ss-drawer-user-role">
                {roleLabels[user.role] || user.role}
                {isCompanyOwner && ' (مدير شركة)'}
              </div>
              {isImpersonating && (
                <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: 'rgba(251, 146, 60, 0.15)', border: '1px solid rgba(251, 146, 60, 0.4)', fontSize: 11, fontWeight: 700, color: '#fb923c' }}>
                  🚪 داخل شركة: {user.companyName || '—'}
                </div>
              )}
            </div>

            <div className="ss-drawer-menu">
              {/* ✅ زر SuperAdmin (للسوبر أدمن بس - مش impersonating) */}
              {isSuperAdmin && !isImpersonating && (
                <Link to="/superadmin" className={`ss-drawer-link ${isActive('/superadmin') ? 'active' : ''}`} onClick={closeDrawer} style={{
                  background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.12), transparent)',
                  borderRightColor: '#a855f7',
                }}>
                  <span className="ss-icon">👑</span>
                  <span>لوحة مدير المنصة</span>
                </Link>
              )}

              {/* ✅ زر الخروج من الشركة (لما impersonating) */}
              {isImpersonating && (
                <button onClick={() => { closeDrawer(); handleExitImpersonate(); }} className="ss-drawer-link" style={{
                  background: 'linear-gradient(90deg, rgba(251, 146, 60, 0.15), transparent)',
                  borderRightColor: '#fb923c', color: '#fb923c',
                }}>
                  <span className="ss-icon">🚪</span>
                  <span>خروج والعودة لـ SuperAdmin</span>
                </button>
              )}

              {/* ✅ تاب "لوحة الإدارة" (SuperAdmin أو Company Owner) */}
              {showAdminTab && (
                <Link to="/admin" className={`ss-drawer-link ${isActive('/admin') ? 'active' : ''}`} onClick={closeDrawer}>
                  <span className="ss-icon">📊</span>
                  <span>لوحة الإدارة</span>
                </Link>
              )}

              {/* ✅ القائمة العادية (للموظفين) */}
              {showRegularMenu && (
                <>
                  <Link to="/dashboard" className={`ss-drawer-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={closeDrawer}>
                    <span className="ss-icon">🏠</span>
                    <span>الرئيسية</span>
                  </Link>
                  <Link to="/attendance" className={`ss-drawer-link ${isActive('/attendance') ? 'active' : ''}`} onClick={closeDrawer}>
                    <span className="ss-icon">📍</span>
                    <span>الحضور والانصراف</span>
                  </Link>
                  <Link to="/leaves" className={`ss-drawer-link ${isActive('/leaves') ? 'active' : ''}`} onClick={closeDrawer}>
                    <span className="ss-icon">📝</span>
                    <span>الإجازات</span>
                  </Link>
                  <Link to="/sync-queue" className={`ss-drawer-link ${isActive('/sync-queue') ? 'active' : ''}`} onClick={closeDrawer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className="ss-icon">🔄</span>
                      <span>المزامنة</span>
                    </div>
                    {queueCount > 0 && <span className="ss-badge-count">{queueCount}</span>}
                  </Link>
                </>
              )}

              <div className="ss-drawer-divider"></div>

              <button className="ss-drawer-link ss-logout-btn" onClick={logout}>
                <span className="ss-icon">🚪</span>
                <span>تسجيل الخروج</span>
              </button>
            </div>

            <div className="ss-drawer-footer">
              © 2026 Nabd — نبض شركتك
              <br />
              v2.9
            </div>
          </aside>
        </>
      )}

      <style>{`
        /* ... (نفس الستايلات القديمة، سيبها زي ما هي) ... */
      `}</style>
    </>
  );
}