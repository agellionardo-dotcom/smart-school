import React, { useEffect, useState } from 'react';
import api from '../../api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#00e5ff', '#a855f7', '#fbbf24', '#10b981', '#ef4444', '#ec4899'];

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/reports/analytics/dashboard');
      setData(data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnalytics(); }, []);

  const formatMoney = (n) => (n || 0).toLocaleString('ar-EG');

  if (loading) {
    return (
      <p style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.6)' }}>
        ⏳ جاري التحميل...
      </p>
    );
  }

  if (!data) {
    return (
      <p style={{ textAlign: 'center', padding: 40, color: '#fca5a5' }}>
        {msg || 'لا توجد بيانات'}
      </p>
    );
  }

  return (
    <div>
      {/* ✅ Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          📊 لوحة التحليلات
        </h3>
        <button
          className="btn gray"
          onClick={loadAnalytics}
          style={{ padding: '10px 20px', fontSize: 13 }}
        >
          🔄 تحديث
        </button>
      </div>

      {/* ✅ Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div className="payroll-stat payroll-stat-info">
          <div className="payroll-stat-value">{data.summary.totalEmployees}</div>
          <div className="payroll-stat-label">👥 إجمالي الموظفين</div>
        </div>
        <div className="payroll-stat payroll-stat-success">
          <div className="payroll-stat-value">{data.summary.todayAttendance}</div>
          <div className="payroll-stat-label">✅ حضور النهاردة</div>
        </div>
        <div className="payroll-stat payroll-stat-warning">
          <div className="payroll-stat-value">{data.summary.activeLeaves}</div>
          <div className="payroll-stat-label">⏳ إجازات معلقة</div>
        </div>
        <div className="payroll-stat payroll-stat-danger">
          <div className="payroll-stat-value">{data.turnoverRate}%</div>
          <div className="payroll-stat-label">🔄 دوران العمالة</div>
        </div>
        <div className="payroll-stat payroll-stat-primary">
          <div className="payroll-stat-value">{data.summary.totalBranches}</div>
          <div className="payroll-stat-label">🏢 الفروع</div>
        </div>
      </div>

      {/* ✅ Payroll Cost Chart */}
      <div className="ss-glass" style={{ padding: 20, marginBottom: 20 }}>
        <h4
          style={{
            color: '#67e8f9',
            marginBottom: 16,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          💰 تكلفة الرواتب (آخر 6 شهور)
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.payrollCosts}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
            <YAxis tickFormatter={(v) => (v / 1000) + 'k'} stroke="rgba(255,255,255,0.6)" />
            <Tooltip
              formatter={(v) => formatMoney(v) + ' ج.م'}
              contentStyle={{
                background: 'rgba(15, 33, 56, 0.95)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                color: '#f8fafc',
              }}
            />
            <Legend wrapperStyle={{ color: '#f8fafc' }} />
            <Bar dataKey="totalNet" fill="#00e5ff" name="الصافي" radius={[8, 8, 0, 0]} />
            <Bar dataKey="totalDeductions" fill="#ef4444" name="الخصومات" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ Attendance Trend */}
      <div className="ss-glass" style={{ padding: 20, marginBottom: 20 }}>
        <h4
          style={{
            color: '#67e8f9',
            marginBottom: 16,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          📉 نسب الغياب (آخر 30 يوم)
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
            <YAxis stroke="rgba(255,255,255,0.6)" />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 33, 56, 0.95)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                color: '#f8fafc',
              }}
            />
            <Legend wrapperStyle={{ color: '#f8fafc' }} />
            <Line type="monotone" dataKey="present" stroke="#10b981" name="حضور" strokeWidth={2} />
            <Line type="monotone" dataKey="late" stroke="#fbbf24" name="تأخير" strokeWidth={2} />
            <Line type="monotone" dataKey="absent" stroke="#ef4444" name="غياب" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ Gender + Age */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div className="ss-glass" style={{ padding: 20 }}>
          <h4
            style={{
              color: '#67e8f9',
              marginBottom: 16,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            👥 التنوع الجندري
          </h4>
          {data.genderData.some(g => g.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.genderData.filter(g => g.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {data.genderData.filter(g => g.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 33, 56, 0.95)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: 40 }}>
              لا توجد بيانات جنس
            </p>
          )}
        </div>

        <div className="ss-glass" style={{ padding: 20 }}>
          <h4
            style={{
              color: '#67e8f9',
              marginBottom: 16,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            🎂 توزيع الأعمار
          </h4>
          {data.ageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.ageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 33, 56, 0.95)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="value" name="عدد الموظفين" radius={[8, 8, 0, 0]}>
                  {data.ageData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: 40 }}>
              لا توجد بيانات أعمار
            </p>
          )}
        </div>
      </div>

      {/* ✅ Branch + Department */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
        }}
      >
        <div className="ss-glass" style={{ padding: 20 }}>
          <h4
            style={{
              color: '#67e8f9',
              marginBottom: 16,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            🏢 توزيع الموظفين حسب الفرع
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.branchDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="rgba(255,255,255,0.6)" />
              <YAxis dataKey="name" type="category" width={120} stroke="rgba(255,255,255,0.6)" />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 33, 56, 0.95)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  color: '#f8fafc',
                }}
              />
              <Bar dataKey="count" name="عدد الموظفين" fill="#a855f7" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="ss-glass" style={{ padding: 20 }}>
          <h4
            style={{
              color: '#67e8f9',
              marginBottom: 16,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            📂 توزيع الموظفين حسب القسم
          </h4>
          {data.departmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.departmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {data.departmentData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 33, 56, 0.95)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: 40 }}>
              لا توجد بيانات أقسام
            </p>
          )}
        </div>
      </div>
    </div>
  );
}