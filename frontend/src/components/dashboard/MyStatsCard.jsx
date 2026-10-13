import React, { useEffect, useState } from 'react';
import api from '../../api';
import { GlassCard } from '../ui';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export default function MyStatsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/my-stats?month=${month}&year=${year}`)
      .then((r) => setData(r.data))
      .catch((err) => console.error('my-stats error:', err))
      .finally(() => setLoading(false));
  }, [month, year]);

  if (loading) {
    return (
      <GlassCard padding="lg" style={{ marginTop: 20 }}>
        <p style={{ textAlign: 'center', color: 'var(--ss-text-muted)' }}>
          ⏳ جاري تحميل التقرير...
        </p>
      </GlassCard>
    );
  }

  if (!data) return null;

  const { stats } = data;

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
          📊 تقريري الشخصي
        </h3>

        {/* Month Selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            className="input"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            style={{ padding: '6px 10px', fontSize: 12, width: 100 }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="input"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={{ padding: '6px 10px', fontSize: 12, width: 80 }}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: 10,
        }}
      >
        <StatBox
          icon="✅"
          label="حضور"
          value={stats.present}
          color="#10b981"
        />
        <StatBox
          icon="❌"
          label="غياب"
          value={stats.absent}
          color="#ef4444"
        />
        <StatBox
          icon="⏰"
          label="تأخير"
          value={stats.late}
          color="#fbbf24"
        />
        <StatBox
          icon="📈"
          label="النسبة"
          value={`${stats.attendanceRate}%`}
          color="#00e5ff"
        />
      </div>

      {/* Monthly Summary */}
      <div
        style={{
          marginTop: 14,
          padding: 12,
          background: 'var(--ss-bg-surface)',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
            إجمالي أيام العمل
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--ss-text-primary)',
            }}
          >
            {stats.expectedWorkDays}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
            إجمالي التأخير
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#fbbf24',
            }}
          >
            {stats.totalLateMinutes} د
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
            إجمالي الحضور
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#34d399',
            }}
          >
            {stats.totalPresent}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 12,
        background: 'var(--ss-bg-surface)',
        borderRadius: 10,
        border: '1px solid var(--ss-border-subtle)',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color,
          marginBottom: 2,
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