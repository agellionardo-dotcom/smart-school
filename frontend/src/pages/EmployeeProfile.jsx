import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { toCairoDate } from '../utils/dateHelpers';

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

  if (loading) return <div className="dashboard"><p style={{ textAlign: 'center', padding: 40 }}>⏳ جاري التحميل...</p></div>;
  if (!profile) return <div className="dashboard"><p style={{ textAlign: 'center', padding: 40, color: '#8e2b2b' }}>{msg || 'مفيش بيانات'}</p></div>;

  const { user, attendance, leaves, payroll } = profile;

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>👤 {user.name}</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>
        {user.position || 'موظف'} · {user.branch?.name || '-'}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
        {[
          { id: 'personal', label: '📋 البيانات الشخصية' },
          { id: 'job', label: '💼 البيانات الوظيفية' },
          { id: 'finance', label: '💰 المالية' },
          { id: 'attendance', label: '📍 الحضور' },
          { id: 'leaves', label: '🏖️ الإجازات' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 18px', borderRadius: 10, border: 'none', flex: '0 0 auto',
            background: tab === t.id ? 'linear-gradient(145deg, #0a1f44, #142b5c)' : '#fff',
            color: tab === t.id ? '#fff' : 'var(--navy)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>{t.label}</button>
        ))}
      </div>

      <div className="glass" style={{ padding: 24 }}>
        {tab === 'personal' && (
          <div>
            <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>📋 البيانات الشخصية</h3>
            <p><b>الاسم:</b> {user.name}</p>
            <p><b>البريد:</b> {user.email}</p>
            <p><b>الهاتف:</b> {user.phone || '-'}</p>
            <p><b>الفرع:</b> {user.branch?.name || '-'}</p>
          </div>
        )}

        {tab === 'job' && (
          <div>
            <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>💼 البيانات الوظيفية</h3>
            <p><b>الدور:</b> {user.role}</p>
            <p><b>القسم:</b> {user.department || '-'}</p>
            <p><b>المسمى:</b> {user.position || '-'}</p>
            <p><b>المدير المباشر:</b> {user.manager?.name || '-'}</p>
          </div>
        )}

        {tab === 'finance' && (
          <div>
            <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>💰 البيانات المالية</h3>
            <p><b>الراتب الأساسي:</b> {user.basicSalary?.toLocaleString('ar-EG') || '-'} ج.م</p>
            <p><b>البدلات:</b> {user.allowances?.toLocaleString('ar-EG') || '-'} ج.م</p>
            {payroll && payroll.length > 0 && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--gray)' }}>
                آخر راتب: {payroll[0]?.month}/{payroll[0]?.year} — {payroll[0]?.netSalary?.toLocaleString('ar-EG')} ج.م
              </p>
            )}
          </div>
        )}

        {tab === 'attendance' && (
          <div>
            <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>📍 سجل الحضور</h3>
            {attendance && attendance.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {attendance.slice(0, 30).map(a => (
                      <tr key={a._id}>
                        <td>{toCairoDate(a.date)}</td>
                        <td>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString('ar-EG') : '-'}</td>
                        <td>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString('ar-EG') : '-'}</td>
                        <td>{a.status === 'late' ? '⏰ متأخر' : a.status === 'present' ? '✅ حاضر' : '❌ غائب'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ color: 'var(--gray)' }}>لا توجد سجلات</p>}
          </div>
        )}

        {tab === 'leaves' && (
          <div>
            <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>🏖️ الإجازات</h3>
            {leaves && leaves.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>النوع</th><th>من</th><th>إلى</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {leaves.map(l => (
                      <tr key={l._id}>
                        <td>{l.type}</td>
                        <td>{toCairoDate(l.startDate)}</td>
                        <td>{toCairoDate(l.endDate)}</td>
                        <td>{l.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ color: 'var(--gray)' }}>لا توجد إجازات</p>}
          </div>
        )}
      </div>
    </div>
  );
}