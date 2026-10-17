// 📁 frontend/src/components/superadmin/OverviewTab.jsx
// ⬅️ ملف جديد — نظرة عامة على المنصة

import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function OverviewTab() {
  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, revenueRes, trialsRes] = await Promise.all([
          api.get('/superadmin/overview'),
          api.get('/superadmin/revenue').catch(() => ({ data: { data: null } })),
          api.get('/superadmin/trials/ending-soon?days=7').catch(() => ({ data: { data: [] } })),
        ]);

        setData(overviewRes.data.data);
        setRevenue(revenueRes.data.data);
        setTrials(trialsRes.data.data || []);
      } catch (err) {
        console.error('Overview load error:', err);
        setError(err.response?.data?.msg || 'فشل تحميل الإحصائيات');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--ss-text-secondary)', padding: 40 }}>
        ⏳ جاري التحميل...
      </p>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 12,
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        ❌ {error}
      </div>
    );
  }

  const { companies, users, attendance } = data || {};

  return (
    <div>
      {/* ✅ Stats Grid */}
      <div className="grid" style={{ marginBottom: 30 }}>
        <div className="superadmin-stat-card">
          <span className="stat-icon">🏢</span>
          <h3>{companies?.total ?? 0}</h3>
          <p>إجمالي الشركات</p>
        </div>

        <div className="superadmin-stat-card success">
          <span className="stat-icon">✅</span>
          <h3>{companies?.active ?? 0}</h3>
          <p>شركات نشطة</p>
        </div>

        <div className="superadmin-stat-card info">
          <span className="stat-icon">🎁</span>
          <h3>{companies?.trial ?? 0}</h3>
          <p>تجريبي (Trial)</p>
        </div>

        <div className="superadmin-stat-card danger">
          <span className="stat-icon">⛔</span>
          <h3>{companies?.suspended ?? 0}</h3>
          <p>موقوفة</p>
        </div>

        <div className="superadmin-stat-card">
          <span className="stat-icon">👥</span>
          <h3>{users?.total ?? 0}</h3>
          <p>إجمالي المستخدمين</p>
        </div>

        <div className="superadmin-stat-card success">
          <span className="stat-icon">🔥</span>
          <h3>{users?.activeThisWeek ?? 0}</h3>
          <p>نشط آخر أسبوع</p>
        </div>

        <div className="superadmin-stat-card warning">
          <span className="stat-icon">📊</span>
          <h3>{attendance?.totalThisMonth ?? 0}</h3>
          <p>حضور الشهر</p>
        </div>

        <div className="superadmin-stat-card info">
          <span className="stat-icon">🆕</span>
          <h3>{companies?.newThisMonth ?? 0}</h3>
          <p>شركات جديدة (30 يوم)</p>
        </div>
      </div>

      {/* ✅ Revenue Section */}
      {revenue && (
        <>
          <h3 className="superadmin-section-title">💰 الإيرادات</h3>
          <div className="grid" style={{ marginBottom: 30 }}>
            <div className="superadmin-stat-card success">
              <h3>
                {revenue.monthlyRecurring?.toLocaleString('ar-EG') ?? 0}
                <span style={{ fontSize: 16, marginRight: 4 }}> {revenue.currency}</span>
              </h3>
              <p>إيراد شهري متكرر (MRR)</p>
            </div>
            <div className="superadmin-stat-card">
              <h3>
                {revenue.yearlyProjected?.toLocaleString('ar-EG') ?? 0}
                <span style={{ fontSize: 16, marginRight: 4 }}> {revenue.currency}</span>
              </h3>
              <p>إيراد سنوي متوقع</p>
            </div>
            <div className="superadmin-stat-card info">
              <h3>{revenue.payingCompanies ?? 0}</h3>
              <p>شركات مدفوعة</p>
            </div>
          </div>
        </>
      )}

      {/* ✅ Trials Ending Soon */}
      {trials.length > 0 && (
        <>
          <h3 className="superadmin-section-title">
            ⏰ Trials قربت تخلص ({trials.length})
          </h3>
          <div style={{ marginBottom: 30 }}>
            {trials.map((c) => {
              const daysLeft = Math.ceil(
                (new Date(c.subscription?.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div key={c._id} className="superadmin-log-row">
                  <span>🏢 <b>{c.name}</b></span>
                  <span className="superadmin-status trial">
                    {daysLeft > 0 ? `${daysLeft} يوم` : 'منتهي'}
                  </span>
                  <span style={{ color: 'var(--ss-text-muted)', fontSize: 12 }}>
                    {c.slug}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ✅ Empty State */}
      {!companies?.total && (
        <div
          className="ss-glass"
          style={{ padding: 40, textAlign: 'center', color: 'var(--ss-text-muted)' }}
        >
          <p style={{ fontSize: 48, margin: 0 }}>🏢</p>
          <p style={{ marginTop: 12 }}>لا توجد شركات مسجلة بعد</p>
        </div>
      )}
    </div>
  );
}