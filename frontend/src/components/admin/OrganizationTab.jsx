// 📁 frontend/src/components/admin/OrganizationTab.jsx
// ⬅️ استبدل الملف بالكامل

import React, { useState, useEffect } from 'react';
import api from '../../api';

// ✅ ترتيب الأدوار (نفس الأدوار الموجودة في النظام، بس بأسماء مختلفة)
const ROLE_HIERARCHY = [
  { key: 'superadmin',    label: '👑 المدير العام', color: '#a855f7' },
  { key: 'company_owner', label: '👑 المدير العام', color: '#a855f7' },
  { key: 'manager',       label: '💼 وكيل إداري',   color: '#3b82f6' },
  { key: 'hr',            label: '👥 موارد بشرية',  color: '#ec4899' },
  { key: 'employee',      label: '👤 موظف',         color: '#10b981' },
  { key: 'viewer',        label: '🛠️ عمال',         color: '#94a3b8' },
];

export default function OrganizationTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/users');
      setUsers(data || []);
    } catch (err) {
      console.error('loadUsers error:', err);
      setMsg('❌ فشل تحميل الموظفين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ✅ تجميع الموظفين حسب الدور (بس مع دمج superadmin و company_owner)
  const groupedByRole = ROLE_HIERARCHY.map((role) => {
    // ← لو الدور superadmin أو company_owner، نعتبرهم "المدير العام"
    const rolesToCheck = role.key === 'superadmin' || role.key === 'company_owner'
      ? ['superadmin', 'company_owner']
      : [role.key];

    return {
      ...role,
      users: users.filter((u) => {
        const roleKey = u.companyRole || u.role;
        return rolesToCheck.includes(roleKey);
      }),
    };
  }).filter((group) => group.users.length > 0);

  // ✅ إزالة التكرار (لو superadmin و company_owner ظهروا مرتين)
  const uniqueGroups = groupedByRole.filter((group, index, self) => {
    if (group.key === 'superadmin' && self.some((g) => g.key === 'company_owner')) {
      return false; // ← نستخدم "company_owner" بس
    }
    return true;
  });

  if (loading) {
    return (
      <div className="dashboard">
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--ss-text-muted)' }}>
          ⏳ جاري التحميل...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--ss-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          📄 الهيكل التنظيمي
        </h3>
        <button
          className="btn gray"
          onClick={loadUsers}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          🔄 تحديث
        </button>
      </div>

      {msg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 16,
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            textAlign: 'right',
            direction: 'rtl',
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}

      {uniqueGroups.length === 0 ? (
        <div className="ss-glass" style={{ padding: 40, textAlign: 'center', color: 'var(--ss-text-muted)' }}>
          <p style={{ fontSize: 48, margin: 0 }}>🏢</p>
          <p>لا يوجد موظفون، تأكد من إضافة موظفين.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {uniqueGroups.map((group) => (
            <div key={group.key}>
              {/* ✅ عنوان الدور */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                  padding: '8px 16px',
                  background: `linear-gradient(90deg, ${group.color}22, transparent)`,
                  borderRight: `4px solid ${group.color}`,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>{group.label.split(' ')[0]}</span>
                <h4
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: group.color,
                  }}
                >
                  {group.label.substring(group.label.indexOf(' '))} ({group.users.length})
                </h4>
              </div>

              {/* ✅ قائمة الموظفين في هذا الدور */}
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {group.users.map((u) => (
                  <div
                    key={u._id}
                    className="ss-glass"
                    style={{
                      padding: 16,
                      borderRight: `3px solid ${group.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${group.color}, ${group.color}88)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {u.name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ss-text-primary)' }}>
                          {u.name}
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ss-text-secondary)' }}>
                          {u.position || '—'}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ss-border-subtle)' }}>
                      <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--ss-text-muted)' }}>
                        🏢 {u.branch?.name || '—'}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--ss-text-muted)' }}>
                        📧 {u.email}
                      </p>
                      {u.department && (
                        <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--ss-text-muted)' }}>
                          💼 {u.department}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}