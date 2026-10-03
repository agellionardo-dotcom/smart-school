import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ from: '', to: '', reason: '' });
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const load = () => axios.get(`${API_URL}/api/leaves/my`, { headers }).then(r => setLeaves(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await axios.post(`${API_URL}/api/leaves`, form, { headers });
    setForm({ from: '', to: '', reason: '' });
    load();
  };

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 20 }}>طلب إجازة</h1>
      <div className="glass" style={{ padding: 30, maxWidth: 600 }}>
        <form onSubmit={submit}>
          <label>من تاريخ</label>
          <input className="input" type="date" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} required />
          <br /><br />
          <label>إلى تاريخ</label>
          <input className="input" type="date" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} required />
          <br /><br />
          <label>السبب</label>
          <textarea className="input" rows="4" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
          <br /><br />
          <button className="btn" style={{ width: '100%' }}>إرسال الطلب</button>
        </form>
      </div>
      <div className="glass" style={{ padding: 24, marginTop: 30 }}>
        <h3 style={{ color: 'var(--navy)' }}>طلباتي</h3>
        <table>
          <thead><tr><th>من</th><th>إلى</th><th>السبب</th><th>الحالة</th></tr></thead>
          <tbody>
            {leaves.map(l => (
              <tr key={l._id}>
                <td>{new Date(l.from).toLocaleDateString('ar-EG')}</td>
                <td>{new Date(l.to).toLocaleDateString('ar-EG')}</td>
                <td>{l.reason}</td>
                <td>{l.status === 'approved' ? '✅ مقبول' : l.status === 'rejected' ? '❌ مرفوض' : '⏳ معلق'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
