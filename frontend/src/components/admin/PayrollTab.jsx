import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const STATUS_LABELS = {
  draft: { label: '📝 مسودة', color: '#b8860b' },
  approved: { label: '✅ معتمد', color: '#2e7d5b' },
  paid: { label: '💰 مدفوع', color: '#0a1f44' },
};

export default function PayrollTab() {
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ==================== جلب الرواتب ====================
  const loadPayrolls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      if (filterStatus) params.append('status', filterStatus);

      const { data } = await axios.get(`${API_URL}/api/payroll?${params}`, { headers });
      setPayrolls(data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل'));
    } finally {
      setLoading(false);
    }
  };

  // ==================== جلب الإحصائيات ====================
  const loadStats = async () => {
    try {
      const { data } = await axios.get(
        `${API_URL}/api/payroll/stats/${filterYear}/${filterMonth}`,
        { headers }
      );
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPayrolls();
    loadStats();
  }, [filterMonth, filterYear, filterStatus]);

  // ==================== اعتماد راتب ====================
  const approvePayroll = async (id) => {
    if (!window.confirm('هل تريد اعتماد هذا الراتب؟')) return;
    try {
      await axios.put(`${API_URL}/api/payroll/${id}/approve`, {}, { headers });
      setMsg('✅ تم اعتماد الراتب');
      loadPayrolls();
      loadStats();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الاعتماد'));
    }
  };

  // ==================== دفع راتب ====================
  const payPayroll = async (id) => {
    if (!window.confirm('هل تريد تسجيل دفع هذا الراتب؟')) return;
    try {
      await axios.put(`${API_URL}/api/payroll/${id}/pay`, {}, { headers });
      setMsg('✅ تم تسجيل الدفع');
      loadPayrolls();
      loadStats();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الدفع'));
    }
  };

  // ==================== حذف راتب ====================
  const deletePayroll = async (id) => {
    if (!window.confirm('هل تريد حذف هذا الراتب؟')) return;
    try {
      await axios.delete(`${API_URL}/api/payroll/${id}`, { headers });
      setMsg('✅ تم الحذف');
      loadPayrolls();
      loadStats();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الحذف'));
    }
  };

  // ==================== إنشاء رواتب جماعية ====================
  const bulkGenerate = async () => {
    if (!window.confirm(`إنشاء رواتب لشهر ${MONTHS[filterMonth - 1]} ${filterYear} لكل الموظفين؟`)) return;
    try {
      setMsg('⏳ جاري الإنشاء...');
      const { data } = await axios.post(
        `${API_URL}/api/payroll/bulk`,
        { month: filterMonth, year: filterYear },
        { headers }
      );
      setMsg(data.msg);
      loadPayrolls();
      loadStats();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الإنشاء'));
    }
  };

  // ==================== تصدير Excel أو PDF ====================
  const exportPayroll = async (type) => {
    try {
      setMsg('⏳ جاري التحميل...');

      const params = new URLSearchParams();
      params.append('month', filterMonth);
      params.append('year', filterYear);

      const response = await axios.get(
        `${API_URL}/api/payroll/export/${type}?${params}`,
        {
          headers,
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const ext = type === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `payroll_${filterYear}_${filterMonth}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMsg('✅ تم تحميل الملف');
    } catch (err) {
      console.error(err);
      setMsg('❌ فشل التحميل');
    }
  };

  // ==================== تحميل قالب Excel للموظفين ====================
  const downloadTemplate = async () => {
    try {
      setMsg('⏳ جاري تحميل القالب...');
      const response = await axios.get(`${API_URL}/api/payroll/template`, {
        headers,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMsg('✅ تم تحميل القالب');
    } catch (err) {
      setMsg('❌ فشل التحميل');
    }
  };

  // ==================== استيراد موظفين من Excel ====================
  const importUsers = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setMsg('⏳ جاري الاستيراد...');

      const { data } = await axios.post(
        `${API_URL}/api/payroll/import`,
        formData,
        {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMsg(data.msg);

      if (data.results?.errors?.length > 0) {
        const errorsToShow = data.results.errors.slice(0, 10).join('\n');
        alert('تفاصيل الأخطاء:\n' + errorsToShow + (data.results.errors.length > 10 ? `\n... و${data.results.errors.length - 10} أخطاء أخرى` : ''));
      }

      loadPayrolls();
      loadStats();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الاستيراد'));
    }

    e.target.value = '';
  };

  // ==================== تنسيق المبلغ ====================
  const formatMoney = (n) => {
    return (n || 0).toLocaleString('ar-EG') + ' ج.م';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>💰 نظام المرتبات</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={bulkGenerate}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            📋 إنشاء رواتب جماعية
          </button>
          <button
            className="btn"
            onClick={() => exportPayroll('excel')}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              background: 'linear-gradient(145deg, #2e7d5b, #1e5a40)',
            }}
          >
            📥 Excel
          </button>
          <button
            className="btn"
            onClick={() => exportPayroll('pdf')}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              background: 'linear-gradient(145deg, #8e2b2b, #5c1c1c)',
            }}
          >
            📄 PDF
          </button>
          <button
            className="btn"
            onClick={downloadTemplate}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              background: 'linear-gradient(145deg, #6b8cae, #3a4a6b)',
            }}
          >
            📋 تحميل قالب
          </button>
          <label
            className="btn"
            style={{
              padding: '10px 20px',
              fontSize: 13,
              background: 'linear-gradient(145deg, #b8860b, #8b6508)',
              cursor: 'pointer',
              display: 'inline-block',
            }}
          >
            📤 استيراد موظفين
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={importUsers}
            />
          </label>
        </div>
      </div>

      {/* فلاتر */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
        background: '#fff',
        padding: 12,
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <select
          className="input"
          value={filterMonth}
          onChange={e => setFilterMonth(parseInt(e.target.value))}
          style={{ flex: '0 0 auto', width: 140, padding: '10px 14px' }}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          className="input"
          value={filterYear}
          onChange={e => setFilterYear(parseInt(e.target.value))}
          style={{ flex: '0 0 auto', width: 100, padding: '10px 14px' }}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          className="input"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ flex: '0 0 auto', width: 140, padding: '10px 14px' }}
        >
          <option value="">كل الحالات</option>
          <option value="draft">📝 مسودة</option>
          <option value="approved">✅ معتمد</option>
          <option value="paid">💰 مدفوع</option>
        </select>

        <button
          className="btn gray"
          onClick={() => { loadPayrolls(); loadStats(); }}
          style={{ padding: '10px 20px', fontSize: 13 }}
        >
          🔄 تحديث
        </button>
      </div>

      {/* الإحصائيات */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}>
          <div style={{ padding: 16, background: '#0a1f44', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{stats.totalEmployees}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>👥 الموظفين</div>
          </div>
          <div style={{ padding: 16, background: '#2e7d5b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{formatMoney(stats.totalBasic)}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>💵 الأساسي</div>
          </div>
          <div style={{ padding: 16, background: '#b8860b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{formatMoney(stats.totalAllowances + stats.totalBonuses)}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>➕ البدلات والمكافآت</div>
          </div>
          <div style={{ padding: 16, background: '#8e2b2b', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{formatMoney(stats.totalDeductions)}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>➖ الخصومات</div>
          </div>
          <div style={{ padding: 16, background: '#6b8cae', color: '#fff', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{formatMoney(stats.totalNet)}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>💰 الصافي</div>
          </div>
        </div>
      )}

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : msg.startsWith('⏳') ? '#fff3cd' : '#f8d7da',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000',
          fontSize: 13,
        }}>{msg}</p>
      )}

      {/* الجدول */}
      <div className="glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>⏳ جاري التحميل...</p>
        ) : payrolls.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>
            لا توجد رواتب لهذا الشهر. اضغط "إنشاء رواتب جماعية" للبدء.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>الفرع</th>
                  <th>الأساسي</th>
                  <th>البدلات</th>
                  <th>المكافآت</th>
                  <th>الخصومات</th>
                  <th>الصافي</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map(p => (
                  <tr key={p._id}>
                    <td><b>{p.user?.name}</b></td>
                    <td style={{ fontSize: 13 }}>{p.branch?.name || '-'}</td>
                    <td>{formatMoney(p.basicSalary)}</td>
                    <td style={{ color: '#2e7d5b' }}>+{formatMoney(p.totalAllowances)}</td>
                    <td style={{ color: '#2e7d5b' }}>+{formatMoney(p.totalBonuses)}</td>
                    <td style={{ color: '#8e2b2b' }}>-{formatMoney(p.totalDeductions)}</td>
                    <td><b style={{ color: '#0a1f44' }}>{formatMoney(p.netSalary)}</b></td>
                    <td>
                      <span style={{
                        background: STATUS_LABELS[p.status]?.color || '#8b95a7',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}>
                        {STATUS_LABELS[p.status]?.label || p.status}
                      </span>
                    </td>
                    <td>
                      {p.status === 'draft' && (
                        <>
                          <button
                            className="btn"
                            style={{ padding: '5px 10px', fontSize: 11, background: '#2e7d5b', marginLeft: 4 }}
                            onClick={() => approvePayroll(p._id)}
                          >
                            ✅ اعتماد
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '5px 10px', fontSize: 11, background: '#8e2b2b', marginLeft: 4 }}
                            onClick={() => deletePayroll(p._id)}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {p.status === 'approved' && (
                        <button
                          className="btn"
                          style={{ padding: '5px 10px', fontSize: 11, background: '#0a1f44' }}
                          onClick={() => payPayroll(p._id)}
                        >
                          💰 دفع
                        </button>
                      )}
                      {p.status === 'paid' && (
                        <span style={{ fontSize: 11, color: '#2e7d5b' }}>✅ مكتمل</span>
                      )}
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