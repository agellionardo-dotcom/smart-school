import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function OverviewTab() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/branches-stats')
      .then(r => setStats(r.data))
      .catch((err) => console.error('loadStats error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
        ⏳ جاري التحميل...
      </p>
    );
  }

  const totals = stats.reduce((acc, b) => ({
    total: acc.total + b.total,
    present: acc.present + b.present,
    late: acc.late + b.late,
    absent: acc.absent + b.absent,
  }), { total: 0, present: 0, late: 0, absent: 0 });

  return (
    <div>
      {/* ✅ Stat Cards */}
      <div className="grid" style={{ marginBottom: 30 }}>
        <div className="stat-card">
          <h3>{totals.total}</h3>
          <p>إجمالي الموظفين</p>
        </div>

        <div className="stat-card stat-card-success">
          <h3>{totals.present}</h3>
          <p>حضور اليوم</p>
        </div>

        <div className="stat-card stat-card-warning">
          <h3>{totals.late}</h3>
          <p>تأخير اليوم</p>
        </div>

        <div className="stat-card stat-card-danger">
          <h3>{totals.absent}</h3>
          <p>غياب اليوم</p>
        </div>
      </div>

      {/* ✅ Branches Title */}
      <h3
        style={{
          marginBottom: 16,
          fontSize: 20,
          fontWeight: 700,
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        🏢 الفروع
      </h3>

      {/* ✅ Branches Grid */}
      <div className="grid">
        {stats.map(b => (
          <div key={b._id} className="ss-glass" style={{ padding: 20 }}>
            <h4
              style={{
                color: '#f8fafc',
                marginBottom: 12,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                fontSize: 14,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              <div>👥 <b>{b.total}</b> موظف</div>
              <div style={{ color: '#34d399' }}>✅ <b>{b.present}</b> حاضر</div>
              <div style={{ color: '#fcd34d' }}>⏰ <b>{b.late}</b> متأخر</div>
              <div style={{ color: '#fca5a5' }}>❌ <b>{b.absent}</b> غائب</div>
            </div>

            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              📍 نطاق: {b.radius}م | {b.location.lat.toFixed(3)}, {b.location.lng.toFixed(3)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}