import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { toCairoDate } from '../utils/dateHelpers';

const TABS = [
  { id: 'personal',   label: '📋 البيانات الشخصية' },
  { id: 'job',        label: '💼 البيانات الوظيفية' },
  { id: 'finance',    label: '💰 المالية' },
  { id: 'attendance', label: '📍 الحضور' },
  { id: 'leaves',     label: '🏖️ الإجازات' },
];

const ROLE_LABELS = {
  superadmin: 'مدير النظام',
  manager:    'مدير فرع',
  hr:         'موارد بشرية',
  employee:   'موظف',
  viewer:     'مشاهد',
};

const ATTENDANCE_STATUS = {
  present: { label: '✅ حاضر',  color: '#34d399' },
  late:    { label: '⏰ متأخر', color: '#fcd34d' },
  absent:  { label: '❌ غائب',  color: '#fca5a5' },
};

export default function EmployeeProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('personal');

  useEffect(() => {
    api.get(`/admin/users/${id}/profile`)
      .then(r => setProfile(r.data))
      .catch(err => setMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="ss-glass" style={{ padding: 24 }}>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            ⏳ جاري التحميل...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="dashboard">
        <div className="ss-glass" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#fca5a5', margin: 0 }}>{msg || 'مفيش بيانات'}</p>
        </div>
      </div>
    );
  }

  const { user, attendance, leaves, payroll } = profile;

  const infoRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: 14,
  };

  const infoLabel = {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: 600,
  };

  const infoValue = {
    color: '#f8fafc',
    fontWeight: 500,
    direction: 'rtl',
  };

  return (
    <div className="dashboard">
      {/* ✅ Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            marginBottom: 8,
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          👤 {user.name}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 14 }}>
          {user.position || 'موظف'} · {user.branch?.name || '-'}
        </p>
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
            direction: 'rtl',
            textAlign: 'right',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
            style={{ fontSize: 13 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ✅ Content */}
      <div className="ss-glass" style={{ padding: 24 }}>
        {tab === 'personal' && (
          <div>
            <h3
              style={{
                color: '#f8fafc',
                marginBottom: 16,
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              📋 البيانات الشخصية
            </h3>
            <div style={infoRow}>
              <span style={infoLabel}>الاسم</span>
              <span style={infoValue}>{user.name}</span>
            </div>
            <div style={infoRow}>
              <span style={infoLabel}>البريد الإلكتروني</span>
              <span style={infoValue}>{user.email}</span>
            </div>
            <div style={infoRow}>
              <span style={infoLabel}>الهاتف</span>
              <span style={infoValue}>{user.phone || '-'}</span>
            </div>
            <div style={{ ...infoRow, borderBottom: 'none' }}>
              <span style={infoLabel}>الفرع</span>
              <span style={infoValue}>{user.branch?.name || '-'}</span>
            </div>
          </div>
        )}

        {tab === 'job' && (
          <div>
            <h3
              style={{
                color: '#f8fafc',
                marginBottom: 16,
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              💼 البيانات الوظيفية
            </h3>
            <div style={infoRow}>
              <span style={infoLabel}>الدور</span>
              <span style={infoValue}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
            <div style={infoRow}>
              <span style={infoLabel}>القسم</span>
              <span style={infoValue}>{user.department || '-'}</span>
            </div>
            <div style={infoRow}>
              <span style={infoLabel}>المسمى الوظيفي</span>
              <span style={infoValue}>{user.position || '-'}</span>
            </div>
            <div style={{ ...infoRow, borderBottom: 'none' }}>
              <span style={infoLabel}>المدير المباشر</span>
              <span style={infoValue}>{user.manager?.name || '-'}</span>
            </div>
          </div>
        )}

        {tab === 'finance' && (
          <div>
            <h3
              style={{
                color: '#f8fafc',
                marginBottom: 16,
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              💰 البيانات المالية
            </h3>
            <div style={infoRow}>
              <span style={infoLabel}>الراتب الأساسي</span>
              <span style={{ ...infoValue, color: '#67e8f9', fontWeight: 700 }}>
                {user.basicSalary?.toLocaleString('ar-EG') || '-'} ج.م
              </span>
            </div>
            <div style={infoRow}>
              <span style={infoLabel}>البدلات</span>
              <span style={{ ...infoValue, color: '#34d399', fontWeight: 700 }}>
                {user.allowances?.toLocaleString('ar-EG') || '-'} ج.م
              </span>
            </div>

            {payroll && payroll.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 12,
                  background:
                    'linear-gradient(135deg, rgba(0, 229, 255, 0.1), rgba(168, 85, 247, 0.08))',
                  border: '1px solid rgba(0, 229, 255, 0.2)',
                }}
              >
                <div
                  style={{
                    color: '#67e8f9',
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  آخر راتب
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    {payroll[0]?.month}/{payroll[0]?.year}
                  </span>
                  <span
                    style={{
                      color: '#f8fafc',
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    {payroll[0]?.netSalary?.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'attendance' && (
          <div>
            <h3
              style={{
                color: '#f8fafc',
                marginBottom: 16,
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              📍 سجل الحضور
            </h3>
            {attendance && attendance.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الحضور</th>
                      <th>الانصراف</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.slice(0, 30).map(a => {
                      const st = ATTENDANCE_STATUS[a.status] || ATTENDANCE_STATUS.present;
                      return (
                        <tr key={a._id}>
                          <td style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {toCairoDate(a.date)}
                          </td>
                          <td style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {a.checkIn
                              ? new Date(a.checkIn).toLocaleTimeString('ar-EG')
                              : '-'}
                          </td>
                          <td style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {a.checkOut
                              ? new Date(a.checkOut).toLocaleTimeString('ar-EG')
                              : '-'}
                          </td>
                          <td>
                            <span
                              style={{
                                color: st.color,
                                fontWeight: 700,
                                fontSize: 13,
                              }}
                            >
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                لا توجد سجلات
              </p>
            )}
          </div>
        )}

        {tab === 'leaves' && (
          <div>
            <h3
              style={{
                color: '#f8fafc',
                marginBottom: 16,
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              🏖️ الإجازات
            </h3>
            {leaves && leaves.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>النوع</th>
                      <th>من</th>
                      <th>إلى</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(l => {
                      const statusGradient =
                        l.status === 'approved'
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : l.status === 'rejected'
                          ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                          : 'linear-gradient(135deg, #fbbf24, #d97706)';
                      const statusLabel =
                        l.status === 'approved'
                          ? '✅ مقبول'
                          : l.status === 'rejected'
                          ? '❌ مرفوض'
                          : '⏳ معلق';

                      return (
                        <tr key={l._id}>
                          <td style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {l.type === 'annual'
                              ? 'سنوية'
                              : l.type === 'sick'
                              ? 'مرضية'
                              : l.type === 'emergency'
                              ? 'طارئة'
                              : 'بدون راتب'}
                          </td>
                          <td style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {toCairoDate(l.startDate)}
                          </td>
                          <td style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {toCairoDate(l.endDate)}
                          </td>
                          <td>
                            <span
                              className="payroll-status"
                              style={{ background: statusGradient }}
                            >
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                لا توجد إجازات
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}