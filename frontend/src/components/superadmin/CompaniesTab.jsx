// 📁 frontend/src/components/superadmin/CompaniesTab.jsx
// ⬅️ استبدل الملف بالكامل

import React, { useState, useEffect } from 'react';
import api from '../../api';
import CreateCompanyModal from './CreateCompanyModal';

const STATUS_LABELS = {
  active: 'نشطة',
  trial: 'تجريبي',
  suspended: 'موقوفة',
  expired: 'منتهي',
  cancelled: 'ملغية',
};

export default function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [impersonating, setImpersonating] = useState(null); // ← ID الشركة الجاري الدخول عليها

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/superadmin/companies');
      setCompanies(data.data || []);
    } catch (err) {
      console.error('loadCompanies error:', err);
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل تحميل الشركات'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const filtered = companies.filter((c) => {
    const matchSearch =
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.slug?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail?.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      filterStatus === 'all' || c.subscription?.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ هل أنت متأكد من حذف الشركة؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }
    try {
      await api.delete(`/superadmin/companies/${id}`);
      setMsg('✅ تم حذف الشركة');
      loadCompanies();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الحذف'));
    }
  };

  const handleSuspend = async (id, currentStatus) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    if (!window.confirm(`هل تريد ${newStatus === 'suspended' ? 'إيقاف' : 'تنشيط'} الشركة؟`)) return;

    try {
      await api.patch(`/superadmin/companies/${id}`, {
        'subscription.status': newStatus,
      });
      setMsg(`✅ تم ${newStatus === 'suspended' ? 'الإيقاف' : 'التنشيط'}`);
      loadCompanies();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التعديل'));
    }
  };

  const handleEdit = (company) => {
    setEditCompany(company);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditCompany(null);
    setShowModal(true);
  };

  // ============================================
  // ✅ Impersonate: دخول الشركة
  // ============================================
  const handleImpersonate = async (company) => {
    const confirmMsg =
      `🚪 هل تريد الدخول لشركة "${company.name}"؟\n\n` +
      `• ستتحول لـ Dashboard الشركة\n` +
      `• يمكنك الرجوع في أي وقت من الـ Navbar\n` +
      `• صلاحية الدخول: ساعتين`;

    if (!window.confirm(confirmMsg)) return;

    setImpersonating(company._id);
    setMsg('');

    try {
      const { data } = await api.post(
        `/superadmin/companies/${company._id}/impersonate`
      );

      if (!data.success || !data.token) {
        throw new Error('فشل استلام التوكن');
      }

      // ✅ احفظ التوكن الأصلي والـ user الأصلي
      const originalToken = localStorage.getItem('token');
      const originalUser = localStorage.getItem('user');

      localStorage.setItem('originalToken', originalToken);
      localStorage.setItem('originalUser', originalUser);

      // ✅ بدّل للتوكن الجديد
      localStorage.setItem('token', data.token);

      // ✅ حدّث الـ user
      const user = JSON.parse(originalUser || '{}');
      const updatedUser = {
        ...user,
        companyId: data.company._id,
        companyName: data.company.name,
        companySlug: data.company.slug,
        isImpersonating: true,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setMsg(`✅ تم الدخول لشركة: ${company.name} — جاري التحويل...`);

      // ✅ روح Dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (err) {
      console.error('Impersonate error:', err);
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الدخول للشركة'));
      setImpersonating(null);
    }
  };

  return (
    <div>
      {/* ✅ Header */}
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
        <h3 className="superadmin-section-title" style={{ margin: 0 }}>
          🏢 الشركات ({filtered.length})
        </h3>
        <button className="btn" onClick={handleCreate}>
          ➕ إضافة شركة جديدة
        </button>
      </div>

      {/* ✅ Filters */}
      <div
        className="ss-glass"
        style={{
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <input
          className="input"
          placeholder="🔍 ابحث بالاسم أو الـ slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          className="input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="trial">تجريبي</option>
          <option value="suspended">موقوفة</option>
          <option value="expired">منتهي</option>
          <option value="cancelled">ملغية</option>
        </select>
      </div>

      {/* ✅ Message */}
      {msg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            background: msg.startsWith('✅')
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: msg.startsWith('✅') ? '#34d399' : '#fca5a5',
            border: `1px solid ${
              msg.startsWith('✅')
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            textAlign: 'right',
            direction: 'rtl',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ Companies */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--ss-text-muted)', padding: 40 }}>
          ⏳ جاري التحميل...
        </p>
      ) : filtered.length === 0 ? (
        <div
          className="ss-glass"
          style={{ padding: 40, textAlign: 'center', color: 'var(--ss-text-muted)' }}
        >
          <p style={{ fontSize: 48, margin: 0 }}>🏢</p>
          <p style={{ marginTop: 12 }}>
            {search || filterStatus !== 'all'
              ? 'لا توجد نتائج مطابقة'
              : 'لا توجد شركات بعد'}
          </p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((c) => {
            const status = c.subscription?.status || 'trial';
            const maxEmp = c.subscription?.maxEmployees || 0;
            const isBusy = impersonating === c._id;

            return (
              <div key={c._id} className="superadmin-company-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <h4>
                    {c.type === 'internal' ? '🏛️' : '🏢'} {c.name}
                  </h4>
                  <span className={`superadmin-status ${status}`}>
                    {STATUS_LABELS[status] || status}
                  </span>
                </div>

                <div className="superadmin-company-meta">
                  <span>🔖 {c.slug}</span>
                  {c.contactEmail && <span>📧 {c.contactEmail}</span>}
                  {c.contactPhone && <span>📞 {c.contactPhone}</span>}
                </div>

                <div className="superadmin-company-meta">
                  <span>
                    👥 {c.usersCount ?? 0} / {maxEmp} مستخدم
                  </span>
                  <span>🎁 {c.subscription?.plan || 'trial'}</span>
                  {c.subscription?.isTrial && (
                    <span style={{ color: '#60a5fa' }}>⏰ Trial</span>
                  )}
                </div>

                {/* ✅ زر دخول الشركة (Impersonate) */}
                <button
                  className="btn"
                  onClick={() => handleImpersonate(c)}
                  disabled={isBusy}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: 13,
                    marginTop: 14,
                    background: isBusy
                      ? 'rgba(168, 85, 247, 0.5)'
                      : 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)',
                    boxShadow: '0 4px 16px rgba(0, 229, 255, 0.3)',
                    cursor: isBusy ? 'wait' : 'pointer',
                  }}
                >
                  {isBusy ? '⏳ جاري الدخول...' : '🚪 دخول الشركة'}
                </button>

                {/* ✅ أزرار التحكم */}
                <div className="superadmin-company-actions">
                  <button
                    className="btn gray"
                    style={{ padding: '6px 12px', fontSize: 12, flex: 1 }}
                    onClick={() => handleEdit(c)}
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    className="btn"
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      flex: 1,
                      background:
                        status === 'suspended'
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    }}
                    onClick={() => handleSuspend(c._id, status)}
                  >
                    {status === 'suspended' ? '▶️ تنشيط' : '⏸️ إيقاف'}
                  </button>
                  <button
                    className="btn danger"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => handleDelete(c._id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ Modal */}
      {showModal && (
        <CreateCompanyModal
          company={editCompany}
          onClose={() => {
            setShowModal(false);
            setEditCompany(null);
          }}
          onSuccess={(msgText) => {
            setMsg(msgText || '✅ تم بنجاح');
            setShowModal(false);
            setEditCompany(null);
            loadCompanies();
          }}
        />
      )}
    </div>
  );
}