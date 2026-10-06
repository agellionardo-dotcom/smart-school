import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../api';

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('personal');

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/users/${id}/profile`, { headers });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'فشل تحميل الملف');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!data) return null;

  const { user, stats, recentAttendance, recentLeaves } = data;

  return (
    <div className="dashboard" style={{ padding: 20 }}>
      {/* زر الرجوع */}
      <button
        className="btn gray"
        style={{ marginBottom: 20, padding: '8px 16px' }}
        onClick={() => navigate(-1)}
      >
        ← رجوع
      </button>

      {/* بطاقة الموظف */}
      <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'var(--navy)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, fontWeight: 'bold'
          }}>
            {user.name?.charAt(0) || '؟'}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>{user.name}</h1>
            <p style={{ color: 'var(--gray)', marginBottom: 4 }}>
              <b>المسمى:</b> {user.position || 'غير محدد'}
            </p>
            <p style={{ color: 'var(--gray)', marginBottom: 4 }}>
              <b>القسم:</b> {user.department || 'غير محدد'}
            </p>
            <p style={{ color: 'var(--gray)' }}>
              <b>الفرع:</b> {user.branch?.name || 'غير محدد'}
            </p>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
        marginBottom: 20
      }}>
        <StatCard title="أيام الحضور" value={stats.attendance.presentDays} color="#2e7d5b" />
        <StatCard title="أيام التأخير" value={stats.attendance.lateDays} color="#b8860b" />
        <StatCard title="أيام الغياب" value={stats.attendance.absentDays} color="#8e2b2b" />
        <StatCard title="هذا الشهر" value={stats.attendance.thisMonth} color="#2e4373" />
        <StatCard title="إجازات معلقة" value={stats.leaves.pending} color="#b8860b" />
        <StatCard title="إجازات مقبولة" value={stats.leaves.approved} color="#2e7d5b" />
      </div>

      {/* التبويبات */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>
            البيانات الشخصية
          </TabButton>
          <TabButton active={activeTab === 'job'} onClick={() => setActiveTab('job')}>
            البيانات الوظيفية
          </TabButton>
          <TabButton active={activeTab === 'financial'} onClick={() => setActiveTab('financial')}>
            البيانات المالية
          </TabButton>
          <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')}>
            سجل الحضور
          </TabButton>
          <TabButton active={activeTab === 'leaves'} onClick={() => setActiveTab('leaves')}>
            الإجازات
          </TabButton>
        </div>

        {activeTab === 'personal' && (
          <InfoGrid items={[
            { label: 'الاسم', value: user.name },
            { label: 'البريد الإلكتروني', value: user.email },
            { label: 'رقم الهاتف', value: user.phone },
            { label: 'الرقم القومي', value: user.nationalId },
            { label: 'تاريخ الميلاد', value: user.birthDate ? new Date(user.birthDate).toLocaleDateString('ar-EG') : null },
            { label: 'العنوان', value: user.address },
            { label: 'جهة اتصال للطوارئ', value: user.emergencyContact?.name ? `${user.emergencyContact.name} (${user.emergencyContact.phone})` : null },
          ]} />
        )}

        {activeTab === 'job' && (
          <InfoGrid items={[
            { label: 'رقم الموظف', value: user.employeeId },
            { label: 'المسمى الوظيفي', value: user.position },
            { label: 'القسم', value: user.department },
            { label: 'الفرع', value: user.branch?.name },
            { label: 'المدير المباشر', value: user.managerId?.name },
            { label: 'الدور', value: user.role },
            { label: 'تاريخ التعيين', value: user.hireDate ? new Date(user.hireDate).toLocaleDateString('ar-EG') : null },
            { label: 'نوع العقد', value: user.contractType },
            { label: 'تاريخ انتهاء العقد', value: user.contractEndDate ? new Date(user.contractEndDate).toLocaleDateString('ar-EG') : null },
          ]} />
        )}

        {activeTab === 'financial' && (
          <InfoGrid items={[
            { label: 'الراتب الأساسي', value: user.salary ? `${user.salary} ج.م` : null },
            { label: 'الحساب البنكي', value: user.bankAccount },
            { label: 'الرقم التأميني', value: user.socialInsurance },
          ]} />
        )}

        {activeTab === 'attendance' && (
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحضور</th>
                <th>الانصراف</th>
                <th>التأخير</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recentAttendance?.map(r => (
                <tr key={r._id}>
                  <td>{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                  <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('ar-EG') : '-'}</td>
                  <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('ar-EG') : '-'}</td>
                  <td>{r.lateMinutes} د</td>
                  <td>{r.status === 'late' ? 'متأخر' : 'في الوقت'}</td>
                </tr>
              ))}
              {(!recentAttendance || recentAttendance.length === 0) && (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888' }}>لا توجد سجلات</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'leaves' && (
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
              {recentLeaves?.map(l => (
                <tr key={l._id}>
                  <td>{l.type || 'عادية'}</td>
                  <td>{new Date(l.fromDate).toLocaleDateString('ar-EG')}</td>
                  <td>{new Date(l.toDate).toLocaleDateString('ar-EG')}</td>
                  <td>{l.status === 'approved' ? 'مقبولة' : l.status === 'rejected' ? 'مرفوضة' : 'معلقة'}</td>
                </tr>
              ))}
              {(!recentLeaves || recentLeaves.length === 0) && (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#888' }}>لا توجد إجازات</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{
      background: color,
      color: '#fff',
      padding: 16,
      borderRadius: 12,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 28, fontWeight: 'bold' }}>{value || 0}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{title}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        background: active ? 'var(--navy)' : '#e0e0e0',
        color: active ? '#fff' : '#333',
        fontWeight: 'bold',
        fontSize: 13
      }}
    >
      {children}
    </button>
  );
}

function InfoGrid({ items }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 12
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          padding: 12,
          background: '#f8f9fa',
          borderRadius: 8,
          borderRight: '4px solid var(--navy)'
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{item.label}</div>
          <div style={{ fontWeight: 'bold', color: 'var(--navy)' }}>{item.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}