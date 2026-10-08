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

  // ✅ لون أصفر جبلي موحد
  const sandGradient = 'linear-gradient(145deg, #d4b876, #c9a961)';

  return (
    <div className="dashboard">
      <h1 style={{
        color: 'var(--navy)',
        marginBottom: 8,
        fontSize: 28,
        fontWeight: 800,
      }}>
        مرحباً، {user.name} 👋
      </h1>
      <p style={{ color: 'var(--text-medium)', marginBottom: 30, fontSize: 15 }}>
        الفرع: {user.branch?.name}
      </p>

      {/* ✅ زر الطوارئ */}
      <EmergencyButton />

      <div className="grid">
        {/* نطاق التسجيل */}
        <div style={{
          padding: 28,
          textAlign: 'center',
          background: sandGradient,
          borderRadius: 20,
          border: '1px solid rgba(10, 31, 68, 0.15)',
          boxShadow: '0 8px 24px rgba(201, 169, 97, 0.25)',
          transition: 'transform 0.3s, box-shadow 0.3s',
        }}>
          <h3 style={{
            fontSize: 42,
            marginBottom: 8,
            color: '#0a1f44',
            fontWeight: 900,
            textShadow: '0 1px 3px rgba(255, 255, 255, 0.4)',
          }}>
            {user.branch?.radius || 5}م
          </h3>
          <p style={{
            color: '#0a1f44',
            fontSize: 15,
            fontWeight: 800,
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
          }}>
            نطاق التسجيل
          </p>
        </div>

        {/* دقائق التأخير */}
        <div style={{
          padding: 28,
          textAlign: 'center',
          background: sandGradient,
          borderRadius: 20,
          border: '1px solid rgba(10, 31, 68, 0.15)',
          boxShadow: '0 8px 24px rgba(201, 169, 97, 0.25)',
          transition: 'transform 0.3s, box-shadow 0.3s',
        }}>
          <h3 style={{
            fontSize: 42,
            marginBottom: 8,
            color: '#0a1f44',
            fontWeight: 900,
            textShadow: '0 1px 3px rgba(255, 255, 255, 0.4)',
          }}>
            {stats.totalLate}
          </h3>
          <p style={{
            color: '#0a1f44',
            fontSize: 15,
            fontWeight: 800,
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
          }}>
            دقائق التأخير
          </p>
        </div>

        {/* أيام الحضور */}
        <div style={{
          padding: 28,
          textAlign: 'center',
          background: sandGradient,
          borderRadius: 20,
          border: '1px solid rgba(10, 31, 68, 0.15)',
          boxShadow: '0 8px 24px rgba(201, 169, 97, 0.25)',
          transition: 'transform 0.3s, box-shadow 0.3s',
        }}>
          <h3 style={{
            fontSize: 42,
            marginBottom: 8,
            color: '#0a1f44',
            fontWeight: 900,
            textShadow: '0 1px 3px rgba(255, 255, 255, 0.4)',
          }}>
            {stats.totalDays}
          </h3>
          <p style={{
            color: '#0a1f44',
            fontSize: 15,
            fontWeight: 800,
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
          }}>
            أيام الحضور
          </p>
        </div>
      </div>
    </div>
  );
}