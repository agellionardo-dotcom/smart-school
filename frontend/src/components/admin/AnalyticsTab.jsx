import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3a4a6b', '#6b8cae', '#b8860b', '#2e7d5b', '#8e2b2b', '#a8c0d6'];

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/reports/analytics/dashboard`, { headers });
      setData(data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const formatMoney = (n) => (n || 0).toLocaleString('ar-EG');

  if (loading) {
    return <p style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>⏳ جاري التحميل...</p>;
  }

  if (!data) {
    return <p style={{ textAlign: 'center', padding: 40, color: '#8e2b2b' }}>{msg || 'لا توجد بيانات'}</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>📊 لوحة التحليلات</h3>
        <button className="btn gray" onClick={loadAnalytics} style={{ padding: '10px 20px', fontSize: 13 }}>
          🔄 تحديث
        </button>
      </div>

      {/* ✅ بطاقات الإحصائيات السريعة */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        <div style={{ padding: 16, background: 'linear-gradient(145deg, #3a4a6b, #2a3550)', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{data.summary.totalEmployees}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>👥 إجمالي الموظفين</div>
        </div>
        <div style={{ padding: 16, background: 'linear-gradient(145deg, #2e7d5b, #1e5a40)', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{data.summary.todayAttendance}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>✅ حضور النهاردة</div>
        </div>
        <div style={{ padding: 16, background: 'linear-gradient(145deg, #b8860b, #8b6508)', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{data.summary.activeLeaves}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>⏳ إجازات معلقة</div>
        </div>
        <div style={{ padding: 16, background: 'linear-gradient(145deg, #8e2b2b, #5c1c1c)', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{data.turnoverRate}%</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>🔄 دوران العمالة</div>
        </div>
        <div style={{ padding: 16, background: 'linear-gradient(145deg, #6b8cae, #3a4a6b)', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{data.summary.totalBranches}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>🏢 الفروع</div>
        </div>
      </div>

      {/* ✅ 1. تكلفة الرواتب (Bar Chart) */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>💰 تكلفة الرواتب (آخر 6 شهور)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.payrollCosts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ef" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => (v / 1000) + 'k'} />
            <Tooltip formatter={(v) => formatMoney(v) + ' ج.م'} />
            <Legend />
            <Bar dataKey="totalNet" fill="#3a4a6b" name="الصافي" radius={[8, 8, 0, 0]} />
            <Bar dataKey="totalDeductions" fill="#8e2b2b" name="الخصومات" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ 2. نسب الغياب (Line Chart) */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>📉 نسب الغياب (آخر 30 يوم)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ef" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="present" stroke="#2e7d5b" name="حضور" strokeWidth={2} />
            <Line type="monotone" dataKey="late" stroke="#b8860b" name="تأخير" strokeWidth={2} />
            <Line type="monotone" dataKey="absent" stroke="#8e2b2b" name="غياب" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ 3. توزيع التنوع الجندري + الأعمار */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
        <div className="glass" style={{ padding: 20 }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>👥 التنوع الجندري</h4>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--gray)', padding: 40 }}>لا توجد بيانات جنس</p>
          )}
        </div>

        <div className="glass" style={{ padding: 20 }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>🎂 توزيع الأعمار</h4>
          {data.ageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.ageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ef" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="عدد الموظفين" radius={[8, 8, 0, 0]}>
                  {data.ageData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--gray)', padding: 40 }}>لا توجد بيانات أعمار</p>
          )}
        </div>
      </div>

      {/* ✅ 4. توزيع الموظفين حسب الفرع + القسم */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="glass" style={{ padding: 20 }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>🏢 توزيع الموظفين حسب الفرع</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.branchDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ef" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="count" name="عدد الموظفين" fill="#3a4a6b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass" style={{ padding: 20 }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>📂 توزيع الموظفين حسب القسم</h4>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--gray)', padding: 40 }}>لا توجد بيانات أقسام</p>
          )}
        </div>
      </div>
    </div>
  );
}