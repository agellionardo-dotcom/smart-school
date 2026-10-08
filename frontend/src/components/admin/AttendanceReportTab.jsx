import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function AttendanceReportTab() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ✅ جلب التقرير
  const loadReport = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${API_URL}/api/reports/monthly-attendance?month=${month}&year=${year}`,
        { headers }
      );
      setReport(data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [month, year]);

  // ✅ تصدير
  const exportReport = async (type) => {
    try {
      setMsg('⏳ جاري التحميل...');
      const response = await axios.get(
        `${API_URL}/api/reports/monthly-attendance/${type}?month=${month}&year=${year}`,
        { headers, responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = type === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `monthly_attendance_${year}_${month}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMsg('✅ تم التحميل');
    } catch (err) {
      setMsg('❌ فشل التحميل');
    }
  };

  // ✅ إحصائيات عامة
  const stats = report.length > 0 ? {
    totalEmployees: report.length,
    totalPresent: report.reduce((s, r) => s + r.presentDays, 0),
    totalLate: report.reduce((s, r) => s + r.lateDays, 0),
    totalAbsent: report.reduce((s, r) => s + r.absentDays, 0),
    avgAttendance: Math.round(report.reduce((s, r) => s + r.attendanceRate, 0) / report.length),
  } : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>📊 تقرير الحضور الشهري</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => exportReport('excel')}
            style={{ padding: '10px 20px', fontSize: 13, background: 'linear-gradient(145deg, #2e7d5b, #1e5a40)' }}>
            📥 Excel
          </button>
          <button className="btn" onClick={() => exportReport('pdf')}
            style={{ padding: '10px 20px', fontSize: 13, background: 'linear-gradient(145deg, #8e2b2b, #5c1c1c)' }}>
            📄 PDF
          </button>
        </div>
      </div>

      {/* فلاتر */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <select className="input" value={month} onChange={e => setMonth(parseInt(e.target.value))}
          style={{ width: 140, padding: '10px 14px' }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="input" value={year} onChange={e => setYear(parseInt(e.target.value))}
          style={{ width: 100, padding: '10px 14px' }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn gray" onClick={loadReport} style={{ padding: '10px 20px', fontSize: 13 }}>
          🔄 تحديث
        </button>
      </div>

      {/* الإحصائيات */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: 16, background: '#0a1f44', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalEmployees}</div>
            <div style={{ fontSize: 12 }}>👥 الموظفين</div>
          </div>
          <div style={{ padding: 16, background: '#2e7d5b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalPresent}</div>
            <div style={{ fontSize: 12 }}>✅ أيام الحضور</div>
          </div>
          <div style={{ padding: 16, background: '#b8860b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalLate}</div>
            <div style={{ fontSize: 12 }}>⏰ أيام التأخير</div>
          </div>
          <div style={{ padding: 16, background: '#8e2b2b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalAbsent}</div>
            <div style={{ fontSize: 12 }}>❌ أيام الغياب</div>
          </div>
          <div style={{ padding: 16, background: '#6b8cae', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.avgAttendance}%</div>
            <div style={{ fontSize: 12 }}>📈 متوسط الحضور</div>
          </div>
        </div>
      )}

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : msg.startsWith('⏳') ? '#fff3cd' : '#f8d7da',
          borderRadius: 8, marginBottom: 16, color: '#000', fontSize: 13,
        }}>{msg}</p>
      )}

      {/* الجدول */}
      <div className="glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>⏳ جاري التحميل...</p>
        ) : report.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>لا توجد بيانات لهذا الشهر</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>الفرع</th>
                  <th>حضور</th>
                  <th>تأخير</th>
                  <th>غياب</th>
                  <th>دقائق التأخير</th>
                  <th>ساعات العمل</th>
                  <th>نسبة الحضور</th>
                </tr>
              </thead>
              <tbody>
                {report.map(r => (
                  <tr key={r.user._id}>
                    <td>
                      <b>{r.user.name}</b>
                      {r.user.position && <div style={{ fontSize: 11, color: '#5a6478' }}>{r.user.position}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{r.branch?.name || '-'}</td>
                    <td style={{ color: '#2e7d5b', fontWeight: 'bold' }}>{r.presentDays}</td>
                    <td style={{ color: '#b8860b', fontWeight: 'bold' }}>{r.lateDays}</td>
                    <td style={{ color: '#8e2b2b', fontWeight: 'bold' }}>{r.absentDays}</td>
                    <td>{r.totalLateMinutes} د</td>
                    <td>{r.totalWorkHours} س</td>
                    <td>
                      <span style={{
                        background: r.attendanceRate >= 90 ? '#2e7d5b' : r.attendanceRate >= 70 ? '#b8860b' : '#8e2b2b',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}>
                        {r.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}