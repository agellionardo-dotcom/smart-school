import React, { useEffect, useState } from 'react';
import api from '../../api';
import { GlassCard } from '../ui';
import { toCairoTime } from '../../utils/dateHelpers';

export default function TeamLists() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/team-stats')
      .then((r) => setData(r.data))
      .catch((err) => console.error('team-lists error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data) return null;

  const { today } = data;

  return (
    <div
      style={{
        marginTop: 20,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}
    >
      {/* ✅ الحضور */}
      <ListCard
        title="✅ الحضور"
        count={today.present}
        color="#10b981"
        items={today.presentList}
        renderItem={(item) => (
          <>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'var(--ss-text-primary)',
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ss-text-muted)',
                  marginTop: 2,
                }}
              >
                {item.position || 'موظف'}
                {item.branch?.name && ` • ${item.branch.name}`}
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#34d399',
                textAlign: 'left',
              }}
            >
              {item.checkIn ? toCairoTime(item.checkIn) : '-'}
            </div>
          </>
        )}
      />

      {/* ❌ الغياب */}
      <ListCard
        title="❌ الغياب"
        count={today.absent}
        color="#ef4444"
        items={today.absentList}
        renderItem={(item) => (
          <>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'var(--ss-text-primary)',
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ss-text-muted)',
                  marginTop: 2,
                }}
              >
                {item.position || 'موظف'}
                {item.branch?.name && ` • ${item.branch.name}`}
              </div>
            </div>
          </>
        )}
      />

      {/* ⏰ التأخير */}
      <ListCard
        title="⏰ التأخير"
        count={today.late}
        color="#fbbf24"
        items={today.lateList}
        renderItem={(item) => (
          <>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'var(--ss-text-primary)',
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ss-text-muted)',
                  marginTop: 2,
                }}
              >
                {item.position || 'موظف'}
                {item.branch?.name && ` • ${item.branch.name}`}
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#fcd34d',
                textAlign: 'left',
              }}
            >
              +{item.lateMinutes} د
            </div>
          </>
        )}
      />
    </div>
  );
}

function ListCard({ title, count, color, items, renderItem }) {
  return (
    <GlassCard padding="md">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid var(--ss-border-subtle)',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ss-text-primary)',
          }}
        >
          {title}
        </h4>
        <span
          style={{
            background: color,
            color: '#fff',
            padding: '2px 10px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      </div>

      {items.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--ss-text-muted)',
            fontSize: 12,
            margin: 0,
            padding: 16,
          }}
        >
          لا يوجد أحد
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {items.map((item) => (
            <div
              key={item._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                borderRadius: 8,
                background: 'var(--ss-bg-surface)',
              }}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}