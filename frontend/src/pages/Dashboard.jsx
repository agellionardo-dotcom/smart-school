import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { toCairoTime } from '../utils/dateHelpers';
import { GlassCard } from '../components/ui';

export default function Dashboard() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/attendance/my')
      .then(({ data }) => {
        if (data.list && data.list.length > 0) {
          setAttendance(data.list[0]);
        }
      })
      .catch((err) => console.error('loadDashboard error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard">
      {/* ✅ Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            color: '#f8fafc',
            marginBottom: 8,
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          👋 مرحباً، {user.name}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 14 }}>
          الفرع: {user.branch?.name || 'غير محدد'}
        </p>
      </div>

      {loading ? (
        <GlassCard padding="lg">
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            ⏳ جاري التحميل...
          </p>
        </GlassCard>
      ) : (
        <>
          {/* ✅ Cards */}
          <div className="grid">
            <GlassCard padding="lg">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 42, marginBottom: 8 }}>
                  {attendance?.checkIn ? '✅' : '📥'}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, margin: 0, fontSize: 15 }}>
                  آخر حضور
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: 8, fontSize: 13, fontWeight: 500 }}>
                  {attendance?.checkIn ? toCairoTime(attendance.checkIn) : 'لم يتم التسجيل'}
                </p>
              </div>
            </GlassCard>

            <GlassCard padding="lg" variant="neon">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 42, marginBottom: 8 }}>
                  {attendance?.checkOut ? '✅' : '📤'}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, margin: 0, fontSize: 15 }}>
                  آخر انصراف
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: 8, fontSize: 13, fontWeight: 500 }}>
                  {attendance?.checkOut ? toCairoTime(attendance.checkOut) : 'لم يتم التسجيل'}
                </p>
              </div>
            </GlassCard>
          </div>

          {/* ✅ Action Buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 14,
              marginTop: 24,
            }}
          >
            <Link
              to="/attendance"
              className="btn"
              style={{ textDecoration: 'none', textAlign: 'center', padding: 16 }}
            >
              📍 الحضور
            </Link>
            <Link
              to="/leaves"
              className="btn gray"
              style={{ textDecoration: 'none', textAlign: 'center', padding: 16 }}
            >
              🏖️ الإجازات
            </Link>
            <Link
              to="/scan-qr"
              className="btn green"
              style={{ textDecoration: 'none', textAlign: 'center', padding: 16 }}
            >
              📱 مسح QR
            </Link>
          </div>
        </>
      )}
    </div>
  );
}