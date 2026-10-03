import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [msg, setMsg] = useState('');
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const load = () => axios.get(`${API_URL}/api/attendance/my`, { headers }).then(r => setRecords(r.data.list));
  useEffect(() => { load(); }, []);

  const getLocation = () => new Promise((res, rej) => {
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      rej, { enableHighAccuracy: true }
    );
  });

  const action = async (type) => {
    try {
      setMsg('⏳ جاري التحقق من الموقع...');
      const loc = await getLocation();
      await axios.post(`${API_URL}/api/attendance/${type}`, loc, { headers });
      setMsg(`✅ تم تسجيل ${type === 'check-in' ? 'الحضور' : 'الانصراف'} بنجاح`);
      load();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.msg || e.message || 'فشل')); }
  };

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 20 }}>الحضور والانصراف</h1>
      <div className="grid">
        <button className="btn" onClick={() => action('check-in')}>🟢 تسجيل الحضور</button>
        <button className="btn gray" onClick={() => action('check-out')}>🔴 تسجيل الانصراف</button>
      </div>
      {msg && <p style={{ marginTop: 20, fontWeight: 'bold', color: 'var(--navy)' }}>{msg}</p>}
      <div className="glass" style={{ padding: 24, marginTop: 30 }}>
        <h3 style={{ color: 'var(--navy)' }}>سجل الحضور</h3>
        <table>
          <thead><tr><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>التأخير</th><th>الحالة</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r._id}>
                <td>{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('ar-EG') : '-'}</td>
                <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('ar-EG') : '-'}</td>
                <td>{r.lateMinutes} د</td>
                <td>{r.status === 'late' ? '⏰ متأخر' : '✅ حاضر'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
