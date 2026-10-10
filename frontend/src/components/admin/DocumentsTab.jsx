import React, { useState, useEffect } from 'react';
import api from '../../api';
import DocumentUpload from '../DocumentUpload';

const STATUS_LABELS = {
  pending: { label: '⏳ قيد المراجعة', color: '#b8860b' },
  approved: { label: '✅ معتمد', color: '#2e7d5b' },
  rejected: { label: '❌ مرفوض', color: '#8e2b2b' },
  expired: { label: '⏰ منتهي', color: '#8e2b2b' },
};

const TYPE_LABELS = {
  national_id: '🪪 بطاقة الرقم القومي',
  birth_certificate: '📜 شهادة الميلاد',
  degree: '🎓 المؤهل الدراسي',
  contract: '📝 العقد',
  health_insurance: '🏥 التأمين الصحي',
  social_insurance: '🛡️ التأمينات الاجتماعية',
  bank_account: '🏦 بيانات البنك',
  experience: '💼 شهادة خبرة',
  personal_photo: '📸 صورة شخصية',
  training: '🎖️ شهادة تدريب',
  medical_report: '📋 تقرير طبي',
  driving_license: '🚗 رخصة قيادة',
  signature: '✍️ التوقيع',
  pledge: '📄 تعهد',
  other: '📎 أخرى',
};

export default function DocumentsTab() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = ['hr', 'manager', 'superadmin'].includes(user.role);

  // ✅ جلب المستخدمين
  useEffect(() => {
    api.get('/admin/users')
      .then((r) => setUsers(r.data))
      .catch((err) => console.error('Users error:', err))
      .finally(() => setLoading(false));
  }, []);

  // ✅ جلب مستندات الموظف
  const loadDocuments = async (userId) => {
    setDocsLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        api.get(`/documents/user/${userId}`),
        api.get(`/documents/user/${userId}/stats`),
      ]);
      setDocuments(docsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Docs error:', err);
      setMsg('❌ فشل تحميل المستندات');
    } finally {
      setDocsLoading(false);
    }
  };

  const handleUserSelect = (u) => {
    setSelectedUser(u);
    setDocuments([]);
    setStats(null);
    loadDocuments(u._id);
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('هل تريد حذف هذا المستند؟')) return;
    try {
      await api.delete(`/documents/${docId}`);
      setMsg('✅ تم الحذف');
      if (selectedUser) loadDocuments(selectedUser._id);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الحذف'));
    }
  };

  const handleReview = async (docId, status) => {
    try {
      await api.put(`/documents/${docId}/review`, { status });
      setMsg(`✅ تم ${status === 'approved' ? 'الاعتماد' : 'الرفض'}`);
      if (selectedUser) loadDocuments(selectedUser._id);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل'));
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <p style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
        ⏳ جاري التحميل...
      </p>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>
          📄 إدارة المستندات
        </h3>
        {selectedUser && canManage && (
          <button className="btn" onClick={() => setShowUpload(true)}>
            ➕ رفع مستند
          </button>
        )}
      </div>

      {msg && (
        <p style={{ padding: 12, background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da', borderRadius: 8, marginBottom: 16, color: '#000' }}>
          {msg}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 2fr' : '1fr', gap: 16 }}>
        {/* قائمة الموظفين */}
        <div className="glass" style={{ padding: 16 }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 12, fontSize: 15 }}>
            👥 اختر موظف
          </h4>
          <input
            className="input"
            placeholder="🔍 ابحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {filteredUsers.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>
                لا يوجد موظفون
              </p>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u._id}
                  onClick={() => handleUserSelect(u)}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 6,
                    background: selectedUser?._id === u._id ? '#0a1f44' : '#f5f7fa',
                    color: selectedUser?._id === u._id ? '#fff' : '#0a1f44',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{u.email}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* المستندات */}
        {selectedUser && (
          <div className="glass" style={{ padding: 16 }}>
            <h4 style={{ color: 'var(--navy)', marginBottom: 12 }}>
              📁 مستندات: {selectedUser.name}
            </h4>

            {/* إحصائيات */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 16 }}>
                <StatCard label="إجمالي" value={stats.total} color="#0a1f44" />
                <StatCard label="معتمد" value={stats.approved} color="#2e7d5b" />
                <StatCard label="قيد المراجعة" value={stats.pending} color="#b8860b" />
                <StatCard label="منتهي" value={stats.expired} color="#8e2b2b" />
                {stats.expiringSoon > 0 && (
                  <StatCard label="قريب الانتهاء" value={stats.expiringSoon} color="#d97706" />
                )}
              </div>
            )}

            {/* ناقص */}
            {stats && stats.missing && stats.missing.length > 0 && (
              <div style={{ padding: 10, background: '#fff3cd', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                ⚠️ <b>مستندات ناقصة:</b>{' '}
                {stats.missing.map((t) => TYPE_LABELS[t] || t).join(' · ')}
              </div>
            )}

            {/* قائمة المستندات */}
            {docsLoading ? (
              <p style={{ textAlign: 'center', color: 'var(--gray)', padding: 20 }}>
                ⏳ جاري التحميل...
              </p>
            ) : documents.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--gray)', padding: 20 }}>
                📭 لا توجد مستندات
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {documents.map((doc) => (
                  <DocCard
                    key={doc._id}
                    doc={doc}
                    canManage={canManage}
                    onDelete={() => handleDelete(doc._id)}
                    onReview={(status) => handleReview(doc._id, status)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal الرفع */}
      {showUpload && selectedUser && (
        <DocumentUpload
          userId={selectedUser._id}
          userName={selectedUser.name}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            setMsg('✅ تم رفع المستند');
            loadDocuments(selectedUser._id);
          }}
        />
      )}
    </div>
  );
}

// ✅ Stat Card
function StatCard({ label, value, color }) {
  return (
    <div style={{ padding: 10, background: color, borderRadius: 8, color: '#fff', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.9 }}>{label}</div>
    </div>
  );
}

// ✅ Document Card
function DocCard({ doc, canManage, onDelete, onReview }) {
  const status = STATUS_LABELS[doc.status] || STATUS_LABELS.pending;
  const typeLabel = TYPE_LABELS[doc.type] || doc.type;

  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
  const isExpiringSoon =
    doc.expiryDate &&
    !isExpired &&
    Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 30;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: '#fff',
        border: `1px solid ${
          isExpired ? '#f8d7da' : isExpiringSoon ? '#fff3cd' : '#e0e6ef'
        }`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, marginBottom: 4 }}>
          {typeLabel}
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>
          {doc.title}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: status.color, color: '#fff', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
            {status.label}
          </span>
          {isExpired && (
            <span style={{ background: '#8e2b2b', color: '#fff', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
              ⏰ منتهي
            </span>
          )}
          {isExpiringSoon && (
            <span style={{ background: '#d97706', color: '#fff', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
              ⚠️ قريب الانتهاء
            </span>
          )}
        </div>
        {doc.expiryDate && (
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
            ⏰ ينتهي: {new Date(doc.expiryDate).toLocaleDateString('ar-EG')}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <a
          href={doc.file?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{ padding: '6px 12px', fontSize: 11, background: '#2e4373', textDecoration: 'none' }}
        >
          👁️ عرض
        </a>

        {canManage && doc.status === 'pending' && (
          <>
            <button
              className="btn"
              onClick={() => onReview('approved')}
              style={{ padding: '6px 12px', fontSize: 11, background: '#2e7d5b' }}
            >
              ✅ اعتماد
            </button>
            <button
              className="btn"
              onClick={() => onReview('rejected')}
              style={{ padding: '6px 12px', fontSize: 11, background: '#b8860b' }}
            >
              ❌ رفض
            </button>
          </>
        )}

        {canManage && (
          <button
            className="btn"
            onClick={onDelete}
            style={{ padding: '6px 12px', fontSize: 11, background: '#8e2b2b' }}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}