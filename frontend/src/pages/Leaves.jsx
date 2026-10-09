import React, { useEffect, useState } from 'react';
import api from '../api';

const LEAVE_TYPES = {
  annual:    { label: 'سنوية',      gradient: 'linear-gradient(135deg, #00e5ff, #a855f7)' },
  sick:      { label: 'مرضية',      gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  emergency: { label: 'طارئة',      gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  unpaid:    { label: 'بدون راتب',  gradient: 'linear-gradient(135deg, #94a3b8, #64748b)' },
};

const STATUS_MAP = {
  approved: { label: '✅ مقبول', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  rejected: { label: '❌ مرفوض', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  pending:  { label: '⏳ معلق',  gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
};

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/leaves/my');
      setLeaves(data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves', form);
      setMsg('✅ تم إرسال الطلب');
      setForm({ type: 'annual', startDate: '', endDate: '', reason: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الإرسال'));
    }
  };

  const labelStyle = {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: 600,
    display: 'block',
    marginBottom: 6,
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
          🏖️ الإجازات
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 14 }}>
          إدارة طلبات الإجازات
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
            background: msg.startsWith('✅')
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: msg.startsWith('✅') ? '#34d399' : '#fca5a5',
            border: `1px solid ${
              msg.startsWith('✅')
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ Add Button */}
      <button
        className="btn"
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 20 }}
      >
        {showForm ? '❌ إلغاء' : '➕ طلب إجازة'}
      </button>

      {/* ✅ Form */}
      {showForm && (
        <div className="ss-glass" style={{ padding: 24, marginBottom: 20 }}>
          <h3
            style={{
              color: '#f8fafc',
              marginBottom: 16,
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            ➕ طلب إجازة جديد
          </h3>
          <form onSubmit={submit}>
            <label style={labelStyle}>نوع الإجازة</label>
            <select
              className="input"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              required
            >
              <option value="annual">سنوية</option>
              <option value="sick">مرضية</option>
              <option value="emergency">طارئة</option>
              <option value="unpaid">بدون راتب</option>
            </select>
            <br /><br />

            <label style={labelStyle}>من تاريخ</label>
            <input
              type="date"
              className="input"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <br /><br />

            <label style={labelStyle}>إلى تاريخ</label>
            <input
              type="date"
              className="input"
              value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
              required
            />
            <br /><br />

            <label style={labelStyle}>السبب (اختياري)</label>
            <textarea
              className="input"
              value={form.reason}
              rows={3}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <br /><br />

            <button className="btn" style={{ width: '100%' }}>
              📤 إرسال الطلب
            </button>
          </form>
        </div>
      )}

      {/* ✅ Table */}
      <div className="ss-glass" style={{ padding: 20 }}>
        <h3
          style={{
            color: '#f8fafc',
            marginBottom: 16,
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          📋 سجل الإجازات ({leaves.length})
        </h3>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            ⏳ جاري التحميل...
          </p>
        ) : leaves.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            لا توجد إجازات
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>النوع</th>
                  <th>من</th>
                  <th>إلى</th>
                  <th>الأيام</th>
                  <th>الحالة</th>
                  <th>السبب</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => {
                  const typeInfo = LEAVE_TYPES[l.type] || LEAVE_TYPES.annual;
                  const statusInfo = STATUS_MAP[l.status] || STATUS_MAP.pending;

                  return (
                    <tr key={l._id}>
                      <td>
                        <span
                          className="payroll-status"
                          style={{ background: typeInfo.gradient }}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {new Date(l.startDate).toLocaleDateString('ar-EG')}
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {new Date(l.endDate).toLocaleDateString('ar-EG')}
                      </td>
                      <td>
                        <b style={{ color: '#67e8f9' }}>{l.days || '-'}</b>
                      </td>
                      <td>
                        <span
                          className="payroll-status"
                          style={{ background: statusInfo.gradient }}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                        {l.reason || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}