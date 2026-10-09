import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { toCairoTime } from '../utils/dateHelpers';

export default function Dashboard() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/attendance/my')
      .then(({ data }) => {
        // آخر سجل حضور
        if (data.list && data.list.length > 0) {
          setAttendance(data.list[0]);
        }
      })
      .catch((err) => console.error('loadDashboard error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>👋 مرحباً، {user.name}</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>
        الفرع: {user.branch?.name || 'غير محدد'}
      </p>

      {loading ? (
        <p style={{ textAlign: 'center', padding: 40 }}>⏳ جاري التحميل...</p>
      ) : (
        <>
          <div className="grid">
            <div className="stat-card">
              <h3>{attendance?.checkIn ? '✅' : '📥'}</h3>
              <p>آخر حضور</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                {attendance?.checkIn ? toCairoTime(attendance.checkIn) : 'لم يتم التسجيل'}
              </p>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(145deg, #3a4a6b, #2a3550)' }}>
              <h3>{attendance?.checkOut ? '✅' : '📤'}</h3>
              <p>آخر انصراف</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                {attendance?.checkOut ? toCairoTime(attendance.checkOut) : 'لم يتم التسجيل'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 24 }}>
            <Link to="/attendance" className="btn" style={{ textDecoration: 'none', textAlign: 'center', padding: 16 }}>
              📍 الحضور
            </Link>
            <Link to="/leaves" className="btn gray" style={{ textDecoration: 'none', textAlign: 'center', padding: 16 }}>
              🏖️ الإجازات
            </Link>
            <Link to="/scan-qr" className="btn" style={{ textDecoration: 'none', textAlign: 'center', padding: 16, background: 'linear-gradient(145deg, #2e7d5b, #1e5a40)' }}>
              📱 مسح QR
            </Link>
          </div>
        </>
      )}
    </div>
  );
}