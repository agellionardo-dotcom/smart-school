import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import EmergencyButton from '../components/EmergencyButton';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState({ totalDays: 0, totalLate: 0 });

  useEffect(() => {
    axios.get(`${API_URL}/api/attendance/my`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => setStats(r.data)).catch(() => {});
  }, []);

  const sandGradient = 'linear-gradient(145deg, #d4b876, #c9a961)';

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8, fontSize: 28, fontWeight: 800 }}>
        مرحباً، {user.name} 👋
      </h1>
      <p style={{ color: 'var(--navy)', marginBottom: 30, fontSize: 15 }}>
        الفرع: {user.branch?.name}
      </p>

      <EmergencyButton />

      <div className="grid">
        <div style={{
          padding: 28, textAlign: 'center', background: sandGradient,
          borderRadius: 20, border: '1px solid rgba(10, 31, 68, 0.15)',
          boxShadow: '0 8px 24px rgba(201, 169, 97, 0.25)',
        }}>
          <h3 style={{ fontSize: 42, marginBottom: 8, color: '#0a1f44', fontWeight: 900 }}>
            {user.branch?.radius || 5}م
          </h3>
          <p style={{ color: '#0a1f44', fontSize: 15, fontWeight: 800 }}>نطاق التسجيل</p>
        </div>

        <div style={{
          padding: 28, textAlign: 'center', background: sandGradient,
          borderRadius: 20, border: '1px solid rgba(10, 31, 68, 0.15)',
          boxShadow: '0 8px 24px rgba(201, 169, 97, 0.25)',
        }}>
          <h3 style={{ fontSize: 42, marginBottom: 8, color: '#0a1f44', fontWeight: 900 }}>
            {stats.totalLate}
          </h3>
          <p style={{ color: '#0a1f44', fontSize: 15, fontWeight: 800 }}>دقائق التأخير</p>
        </div>

        <div style={{
          padding: 28, textAlign: 'center', background: sandGradient,
          borderRadius: 20, border: '1px solid rgba(10, 31, 68, 0.15)',
          boxShadow: '0 8px 24px rgba(201, 169, 97, 0.25)',
        }}>
          <h3 style={{ fontSize: 42, marginBottom: 8, color: '#0a1f44', fontWeight: 900 }}>
            {stats.totalDays}
          </h3>
          <p style={{ color: '#0a1f44', fontSize: 15, fontWeight: 800 }}>أيام الحضور</p>
        </div>
      </div>
    </div>
  );
}