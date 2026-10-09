import React, { useEffect, useState } from 'react';
import api from '../api';

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

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>🏖️ الإجازات</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>إدارة طلبات الإجازات</p>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da',
          borderRadius: 8, marginBottom: 16, color: '#000'
        }}>{msg}</p>
      )}

      <button className="btn" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
        {showForm ? '❌ إلغاء' : '➕ طلب إجازة'}
      </button>

      {showForm && (
        <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>طلب إجازة جديد</h3>
          <form onSubmit={submit}>
            <label>نوع الإجازة</label>
            <select className="input" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })} required>
              <option value="annual">سنوية</option>
              <option value="sick">مرضية</option>
              <option value="emergency">طارئة</option>
              <option value="unpaid">بدون راتب</option>
            </select>
            <br /><br />

            <label>من تاريخ</label>
            <input type="date" className="input" value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            <br /><br />

            <label>إلى تاريخ</label>
            <input type="date" className="input" value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })} required />
            <br /><br />

            <label>السبب (اختياري)</label>
            <textarea className="input" value={form.reason} rows={3}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            <br /><br />

            <button className="btn" style={{ width: '100%' }}>📤 إرسال الطلب</button>
          </form>
        </div>
      )}

      <div className="glass" style={{ padding: 20 }}>
        <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>📋 سجل الإجازات ({leaves.length})</h3>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>⏳ جاري التحميل...</p>
        ) : leaves.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>لا توجد إجازات</p>
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
                {leaves.map(l => (
                  <tr key={l._id}>
                    <td>{l.type === 'annual' ? 'سنوية' : l.type === 'sick' ? 'مرضية' : l.type === 'emergency' ? 'طارئة' : 'بدون راتب'}</td>
                    <td>{new Date(l.startDate).toLocaleDateString('ar-EG')}</td>
                    <td>{new Date(l.endDate).toLocaleDateString('ar-EG')}</td>
                    <td>{l.days || '-'}</td>
                    <td>
                      <span style={{
                        background: l.status === 'approved' ? '#2e7d5b' : l.status === 'rejected' ? '#8e2b2b' : '#b8860b',
                        color: '#fff', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 'bold'
                      }}>
                        {l.status === 'approved' ? '✅ مقبول' : l.status === 'rejected' ? '❌ مرفوض' : '⏳ معلق'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{l.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}