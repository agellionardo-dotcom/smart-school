import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState({ totalDays: 0, totalLate: 0 });

  useEffect(() => {
    axios.get(`${API_URL}/api/attendance/my`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>مرحباً، {user.name} 👋</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 30 }}>الفرع: {user.branch?.name}</p>
      <div className="grid">
        <div className="stat-card"><h3>{stats.totalDays}</h3><p>أيام الحضور</p></div>
        <div className="stat-card" style={{ background: 'linear-gradient(145deg, #5a6478, #3e4657)' }}>
          <h3>{stats.totalLate}</h3><p>دقائق التأخير</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(145deg, #2e4373, #1a2a52)' }}>
          <h3>{user.branch?.radius || 5}م</h3><p>نطاق التسجيل</p>
        </div>
      </div>
    </div>
  );
}
