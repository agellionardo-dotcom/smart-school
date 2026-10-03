import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';

export default function OverviewTab() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    axios.get(`${API_URL}/api/admin/branches-stats`, { headers })
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: 'center' }}>جاري التحميل...</p>;

  const totals = stats.reduce((acc, b) => ({
    total: acc.total + b.total,
    present: acc.present + b.present,
    late: acc.late + b.late,
    absent: acc.absent + b.absent,
  }), { total: 0, present: 0, late: 0, absent: 0 });

  return (
    <div>
      <div className="grid" style={{ marginBottom: 30 }}>
        <div className="stat-card">
          <h3>{totals.total}</h3>
          <p>إجمالي الموظفين</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(145deg, #2e7d5b, #1e5a40)' }}>
          <h3>{totals.present}</h3>
          <p>حضور اليوم</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(145deg, #b8860b, #8b6508)' }}>
          <h3>{totals.late}</h3>
          <p>تأخير اليوم</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(145deg, #8e2b2b, #5c1c1c)' }}>
          <h3>{totals.absent}</h3>
          <p>غياب اليوم</p>
        </div>
      </div>

      <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>🏢 الفروع</h3>
      <div className="grid">
        {stats.map(b => (
          <div key={b._id} className="glass" style={{ padding: 20 }}>
            <h4 style={{ color: 'var(--navy)', marginBottom: 12 }}>
              {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 14 }}>
              <div>👥 <b>{b.total}</b> موظف</div>
              <div style={{ color: '#2e7d5b' }}>✅ <b>{b.present}</b> حاضر</div>
              <div style={{ color: '#b8860b' }}>⏰ <b>{b.late}</b> متأخر</div>
              <div style={{ color: '#8e2b2b' }}>❌ <b>{b.absent}</b> غائب</div>
            </div>
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--gray)' }}>
              📍 نطاق: {b.radius}م | {b.location.lat.toFixed(3)}, {b.location.lng.toFixed(3)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}