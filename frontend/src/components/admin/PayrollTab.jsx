import { toCairo } from '../../utils/dateHelpers';
import React, { useEffect, useState } from 'react';
import api from '../../api';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const STATUS_LABELS = {
  draft: { label: '📝 مسودة', color: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  approved: { label: '✅ معتمد', color: 'linear-gradient(135deg, #10b981, #059669)' },
  paid: { label: '💰 مدفوع', color: 'linear-gradient(135deg, #00e5ff, #a855f7)' },
};

export default function PayrollTab() {
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('');

  // ==================== جلب الرواتب ====================
  const loadPayrolls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      if (filterStatus) params.append('status', filterStatus);

      const { data } = await api.get(`/payroll?${params}`);
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
      const { data } = await api.get(`/payroll/stats/${filterYear}/${filterMonth}`);
      setStats(data);
    } catch (err) {
      console.error('loadStats error:', err);
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
      await api.put(`/payroll/${id}/approve`, {});
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
      await api.put(`/payroll/${id}/pay`, {});
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
      await api.delete(`/payroll/${id}`);
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
      const { data } = await api.post('/payroll/bulk', {
        month: filterMonth,
        year: filterYear,
      });
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

      const response = await api.get(`/payroll/export/${type}?${params}`, {
        responseType: 'blob',
      });

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
      const response = await api.get('/payroll/template', {
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

      const { data } = await api.post('/payroll/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

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
      {/* ✅ Header + Actions */}
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
          💰 نظام المرتبات
        </h3>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={bulkGenerate}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            📋 إنشاء رواتب جماعية
          </button>
          <button
            className="btn green"
            onClick={() => exportPayroll('excel')}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            📥 Excel
          </button>
          <button
            className="btn danger"
            onClick={() => exportPayroll('pdf')}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            📄 PDF
          </button>
          <button
            className="btn gray"
            onClick={downloadTemplate}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            📋 تحميل قالب
          </button>
          <label
            className="btn"
            style={{
              padding: '10px 20px',
              fontSize: 13,
              background: 'linear-gradient(135deg, #fbbf24, #d97706)',
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
          <div className="payroll-stat payroll-stat-success">
            <div className="payroll-stat-value">{formatMoney(stats.totalBasic)}</div>
            <div className="payroll-stat-label">💵 الأساسي</div>
          </div>
          <div className="payroll-stat payroll-stat-warning">
            <div className="payroll-stat-value">{formatMoney(stats.totalAllowances + stats.totalBonuses)}</div>
            <div className="payroll-stat-label">➕ البدلات والمكافآت</div>
          </div>
          <div className="payroll-stat payroll-stat-danger">
            <div className="payroll-stat-value">{formatMoney(stats.totalDeductions)}</div>
            <div className="payroll-stat-label">➖ الخصومات</div>
          </div>
          <div className="payroll-stat payroll-stat-primary">
            <div className="payroll-stat-value">{formatMoney(stats.totalNet)}</div>
            <div className="payroll-stat-label">💰 الصافي</div>
          </div>
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
        ) : payrolls.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
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
                    <td style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                      {p.branch?.name || '-'}
                    </td>
                    <td>{formatMoney(p.basicSalary)}</td>
                    <td style={{ color: '#34d399' }}>+{formatMoney(p.totalAllowances)}</td>
                    <td style={{ color: '#34d399' }}>+{formatMoney(p.totalBonuses)}</td>
                    <td style={{ color: '#fca5a5' }}>-{formatMoney(p.totalDeductions)}</td>
                    <td>
                      <b style={{ color: '#67e8f9' }}>{formatMoney(p.netSalary)}</b>
                    </td>
                    <td>
                      <span
                        className="payroll-status"
                        style={{
                          background: STATUS_LABELS[p.status]?.color || 'rgba(255,255,255,0.1)',
                        }}
                      >
                        {STATUS_LABELS[p.status]?.label || p.status}
                      </span>
                    </td>
                    <td>
                      {p.status === 'draft' && (
                        <>
                          <button
                            className="btn green"
                            style={{ padding: '5px 10px', fontSize: 11, marginLeft: 4 }}
                            onClick={() => approvePayroll(p._id)}
                          >
                            ✅ اعتماد
                          </button>
                          <button
                            className="btn danger"
                            style={{ padding: '5px 10px', fontSize: 11, marginLeft: 4 }}
                            onClick={() => deletePayroll(p._id)}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {p.status === 'approved' && (
                        <button
                          className="btn"
                          style={{ padding: '5px 10px', fontSize: 11 }}
                          onClick={() => payPayroll(p._id)}
                        >
                          💰 دفع
                        </button>
                      )}
                      {p.status === 'paid' && (
                        <span style={{ fontSize: 11, color: '#34d399' }}>✅ مكتمل</span>
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