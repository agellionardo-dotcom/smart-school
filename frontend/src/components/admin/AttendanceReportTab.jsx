import { toCairo } from '../../utils/dateHelpers';
import React, { useEffect, useState } from 'react';
import api from '../../api';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function AttendanceReportTab() {
  const [subTab, setSubTab] = useState('attendance');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const loadData = async () => {
    try {
      setLoading(true);
      const endpoint = subTab === 'attendance' ? 'monthly-attendance' : 'absence-late';
      const { data } = await api.get(`/reports/${endpoint}?month=${month}&year=${year}`);
      setData(data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [month, year, subTab]);

  const exportReport = async (type) => {
    try {
      setMsg('⏳ جاري التحميل...');
      const endpoint = subTab === 'attendance' ? 'monthly-attendance' : 'absence-late';
      const response = await api.get(
        `/reports/${endpoint}/${type}?month=${month}&year=${year}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = type === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `${endpoint}_${year}_${month}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMsg('✅ تم التحميل');
    } catch (err) {
      setMsg('❌ فشل التحميل');
    }
  };

  const stats = data.length > 0 ? {
    totalEmployees: data.length,
    totalPresent: subTab === 'attendance' ? data.reduce((s, r) => s + r.presentDays, 0) : 0,
    avgAttendance: subTab === 'attendance' ? Math.round(data.reduce((s, r) => s + r.attendanceRate, 0) / data.length) : 0,
    totalAbsent: subTab === 'absence-late' ? data.reduce((s, r) => s + r.absentDays, 0) : 0,
    totalLate: subTab === 'absence-late' ? data.reduce((s, r) => s + r.lateDays, 0) : 0,
    totalLateMinutes: subTab === 'absence-late' ? data.reduce((s, r) => s + r.totalLateMinutes, 0) : 0,
  } : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>📊 التقارير المتقدمة</h3>
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setSubTab('attendance')} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none',
          background: subTab === 'attendance' ? 'linear-gradient(145deg, #0a1f44, #142b5c)' : '#fff',
          color: subTab === 'attendance' ? '#fff' : 'var(--navy)',
          fontSize: 13, fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'inherit',
        }}>📊 الحضور الشهري</button>
        <button onClick={() => setSubTab('absence-late')} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none',
          background: subTab === 'absence-late' ? 'linear-gradient(145deg, #8e2b2b, #5c1c1c)' : '#fff',
          color: subTab === 'absence-late' ? '#fff' : 'var(--navy)',
          fontSize: 13, fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontFamily: 'inherit',
        }}>📉 الغياب والتأخير</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <select className="input" value={month} onChange={e => setMonth(parseInt(e.target.value))}
          style={{ width: 140, padding: '10px 14px' }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="input" value={year} onChange={e => setYear(parseInt(e.target.value))}
          style={{ width: 100, padding: '10px 14px' }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn gray" onClick={loadData} style={{ padding: '10px 20px', fontSize: 13 }}>🔄 تحديث</button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: 16, background: '#0a1f44', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalEmployees}</div>
            <div style={{ fontSize: 12 }}>👥 الموظفين</div>
          </div>
          {subTab === 'attendance' && (
            <>
              <div style={{ padding: 16, background: '#2e7d5b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalPresent}</div>
                <div style={{ fontSize: 12 }}>✅ أيام الحضور</div>
              </div>
              <div style={{ padding: 16, background: '#6b8cae', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.avgAttendance}%</div>
                <div style={{ fontSize: 12 }}>📈 متوسط الحضور</div>
              </div>
            </>
          )}
          {subTab === 'absence-late' && (
            <>
              <div style={{ padding: 16, background: '#8e2b2b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalAbsent}</div>
                <div style={{ fontSize: 12 }}>❌ أيام الغياب</div>
              </div>
              <div style={{ padding: 16, background: '#b8860b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalLate}</div>
                <div style={{ fontSize: 12 }}>⏰ أيام التأخير</div>
              </div>
              <div style={{ padding: 16, background: '#5a6478', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{stats.totalLateMinutes} د</div>
                <div style={{ fontSize: 12 }}>⏱️ دقائق التأخير</div>
              </div>
            </>
          )}
        </div>
      )}

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : msg.startsWith('⏳') ? '#fff3cd' : '#f8d7da',
          borderRadius: 8, marginBottom: 16, color: '#000', fontSize: 13,
        }}>{msg}</p>
      )}

      <div className="glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>⏳ جاري التحميل...</p>
        ) : data.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>لا توجد بيانات لهذا الشهر</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {subTab === 'attendance' ? (
              <table>
                <thead>
                  <tr>
                    <th>الموظف</th><th>الفرع</th><th>حضور</th><th>تأخير</th><th>غياب</th>
                    <th>دقائق التأخير</th><th>ساعات العمل</th><th>نسبة الحضور</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(r => (
                    <tr key={r.user._id}>
                      <td><b>{r.user.name}</b>{r.user.position && <div style={{ fontSize: 11, color: '#5a6478' }}>{r.user.position}</div>}</td>
                      <td style={{ fontSize: 13 }}>{r.branch?.name || '-'}</td>
                      <td style={{ color: '#2e7d5b', fontWeight: 'bold' }}>{r.presentDays}</td>
                      <td style={{ color: '#b8860b', fontWeight: 'bold' }}>{r.lateDays}</td>
                      <td style={{ color: '#8e2b2b', fontWeight: 'bold' }}>{r.absentDays}</td>
                      <td>{r.totalLateMinutes} د</td>
                      <td>{r.totalWorkHours} س</td>
                      <td>
                        <span style={{
                          background: r.attendanceRate >= 90 ? '#2e7d5b' : r.attendanceRate >= 70 ? '#b8860b' : '#8e2b2b',
                          color: '#fff', padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 'bold',
                        }}>{r.attendanceRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>الموظف</th><th>الفرع</th><th>أيام الغياب</th><th>أيام التأخير</th>
                    <th>إجمالي دقائق التأخير</th><th>متوسط التأخير اليومي</th><th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(r => {
                    const score = r.absentDays * 100 + r.totalLateMinutes;
                    const status = score === 0 ? { label: '✅ ممتاز', color: '#2e7d5b' } :
                                   score < 100 ? { label: '🟡 مقبول', color: '#b8860b' } :
                                   score < 300 ? { label: '🟠 يحتاج متابعة', color: '#d97706' } :
                                   { label: '🔴 يحتاج تحذير', color: '#8e2b2b' };
                    return (
                      <tr key={r.user._id}>
                        <td><b>{r.user.name}</b>{r.user.position && <div style={{ fontSize: 11, color: '#5a6478' }}>{r.user.position}</div>}</td>
                        <td style={{ fontSize: 13 }}>{r.branch?.name || '-'}</td>
                        <td><span style={{ color: r.absentDays > 0 ? '#8e2b2b' : '#2e7d5b', fontWeight: 'bold', fontSize: 14 }}>{r.absentDays}</span></td>
                        <td><span style={{ color: r.lateDays > 0 ? '#b8860b' : '#2e7d5b', fontWeight: 'bold', fontSize: 14 }}>{r.lateDays}</span></td>
                        <td>{r.totalLateMinutes} د</td>
                        <td>{r.avgLateMinutes} د</td>
                        <td>
                          <span style={{ background: status.color, color: '#fff', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 'bold' }}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}