import React, { useEffect, useState } from 'react';
import api from '../../api';
import { GlassCard } from '../ui';

export default function TeamStatsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = branch ? `?branch=${branch}` : '';
    api.get(`/dashboard/team-stats${params}`)
      .then((r) => setData(r.data))
      .catch((err) => console.error('team-stats error:', err))
      .finally(() => setLoading(false));
  }, [branch]);

  if (loading) {
    return (
      <GlassCard padding="lg" style={{ marginTop: 20 }}>
        <p style={{ textAlign: 'center', color: 'var(--ss-text-muted)' }}>
          ⏳ جاري تحميل الإحصائيات...
        </p>
      </GlassCard>
    );
  }

  if (!data) return null;

  const { today, scope, branches } = data;

  return (
    <GlassCard padding="lg" style={{ marginTop: 20 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ss-text-primary)',
          }}
        >
          📊 إحصائيات الفريق — اليوم
        </h3>

        {/* Branch Selector (لو HR رئيسي) */}
        {scope === 'all' && branches?.length > 0 && (
          <select
            className="input"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, width: 160 }}
          >
            <option value="">🏢 كل الفروع</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
        }}
      >
        <StatBox
          icon="👥"
          label="إجمالي الموظفين"
          value={today.totalEmployees}
          color="#00e5ff"
        />
        <StatBox
          icon="✅"
          label="حضور"
          value={today.present}
          color="#10b981"
        />
        <StatBox
          icon="❌"
          label="غياب"
          value={today.absent}
          color="#ef4444"
        />
        <StatBox
          icon="⏰"
          label="تأخير"
          value={today.late}
          color="#fbbf24"
        />
      </div>
    </GlassCard>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 14,
        background: 'var(--ss-bg-surface)',
        borderRadius: 10,
        border: '1px solid var(--ss-border-subtle)',
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          color,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
        {label}
      </div>
    </div>
  );
}