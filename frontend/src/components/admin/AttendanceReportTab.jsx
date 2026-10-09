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
          📊 التقارير المتقدمة
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn green"
            onClick={() => exportReport('excel')}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            📥 Excel
          </button>
          <button
            className="btn danger"
            onClick={() => exportReport('pdf')}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* ✅ Sub Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setSubTab('attendance')}
          className={`admin-tab ${subTab === 'attendance' ? 'active' : ''}`}
          style={{ padding: '10px 20px', fontSize: 13 }}
        >
          📊 الحضور الشهري
        </button>
        <button
          onClick={() => setSubTab('absence-late')}
          className={`admin-tab ${subTab === 'absence-late' ? 'active' : ''}`}
          style={{ padding: '10px 20px', fontSize: 13 }}
        >
          📉 الغياب والتأخير
        </button>
      </div>

      {/* ✅ Filters */}
      <div
        className="ss-glass-subtle"
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
          padding: 12,
          borderRadius: 12,
        }}
      >
        <select
          className="input"
          value={month}
          onChange={e => setMonth(parseInt(e.target.value))}
          style={{ width: 140, padding: '10px 14px' }}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          className="input"
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
          style={{ width: 100, padding: '10px 14px' }}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          className="btn gray"
          onClick={loadData}
          style={{ padding: '10px 20px', fontSize: 13 }}
        >
          🔄 تحديث
        </button>
      </div>

      {/* ✅ Stats */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div className="payroll-stat payroll-stat-info">
            <div className="payroll-stat-value">{stats.totalEmployees}</div>
            <div className="payroll-stat-label">👥 الموظفين</div>
          </div>

          {subTab === 'attendance' && (
            <>
              <div className="payroll-stat payroll-stat-success">
                <div className="payroll-stat-value">{stats.totalPresent}</div>
                <div className="payroll-stat-label">✅ أيام الحضور</div>
              </div>
              <div className="payroll-stat payroll-stat-primary">
                <div className="payroll-stat-value">{stats.avgAttendance}%</div>
                <div className="payroll-stat-label">📈 متوسط الحضور</div>
              </div>
            </>
          )}

          {subTab === 'absence-late' && (
            <>
              <div className="payroll-stat payroll-stat-danger">
                <div className="payroll-stat-value">{stats.totalAbsent}</div>
                <div className="payroll-stat-label">❌ أيام الغياب</div>
              </div>
              <div className="payroll-stat payroll-stat-warning">
                <div className="payroll-stat-value">{stats.totalLate}</div>
                <div className="payroll-stat-label">⏰ أيام التأخير</div>
              </div>
              <div className="payroll-stat payroll-stat-info">
                <div className="payroll-stat-value">{stats.totalLateMinutes} د</div>
                <div className="payroll-stat-label">⏱️ دقائق التأخير</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ✅ Message */}
      {msg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            direction: 'rtl',
            textAlign: 'right',
            background: msg.startsWith('✅')
              ? 'rgba(16, 185, 129, 0.15)'
              : msg.startsWith('⏳')
              ? 'rgba(251, 191, 36, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: msg.startsWith('✅')
              ? '#34d399'
              : msg.startsWith('⏳')
              ? '#fcd34d'
              : '#fca5a5',
            border: `1px solid ${
              msg.startsWith('✅')
                ? 'rgba(16, 185, 129, 0.3)'
                : msg.startsWith('⏳')
                ? 'rgba(251, 191, 36, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ Table */}
      <div className="ss-glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            ⏳ جاري التحميل...
          </p>
        ) : data.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            لا توجد بيانات لهذا الشهر
          </p>
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
                      <td>
                        <b>{r.user.name}</b>
                        {r.user.position && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                            {r.user.position}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                        {r.branch?.name || '-'}
                      </td>
                      <td style={{ color: '#34d399', fontWeight: 'bold' }}>{r.presentDays}</td>
                      <td style={{ color: '#fcd34d', fontWeight: 'bold' }}>{r.lateDays}</td>
                      <td style={{ color: '#fca5a5', fontWeight: 'bold' }}>{r.absentDays}</td>
                      <td>{r.totalLateMinutes} د</td>
                      <td>{r.totalWorkHours} س</td>
                      <td>
                        <span
                          className="payroll-status"
                          style={{
                            background:
                              r.attendanceRate >= 90
                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                : r.attendanceRate >= 70
                                ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                                : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                          }}
                        >
                          {r.attendanceRate}%
                        </span>
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
                    const status =
                      score === 0
                        ? { label: '✅ ممتاز', gradient: 'linear-gradient(135deg, #10b981, #059669)' }
                        : score < 100
                        ? { label: '🟡 مقبول', gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' }
                        : score < 300
                        ? { label: '🟠 يحتاج متابعة', gradient: 'linear-gradient(135deg, #fb923c, #ea580c)' }
                        : { label: '🔴 يحتاج تحذير', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' };

                    return (
                      <tr key={r.user._id}>
                        <td>
                          <b>{r.user.name}</b>
                          {r.user.position && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                              {r.user.position}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                          {r.branch?.name || '-'}
                        </td>
                        <td>
                          <span
                            style={{
                              color: r.absentDays > 0 ? '#fca5a5' : '#34d399',
                              fontWeight: 'bold',
                              fontSize: 14,
                            }}
                          >
                            {r.absentDays}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              color: r.lateDays > 0 ? '#fcd34d' : '#34d399',
                              fontWeight: 'bold',
                              fontSize: 14,
                            }}
                          >
                            {r.lateDays}
                          </span>
                        </td>
                        <td>{r.totalLateMinutes} د</td>
                        <td>{r.avgLateMinutes} د</td>
                        <td>
                          <span
                            className="payroll-status"
                            style={{ background: status.gradient }}
                          >
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