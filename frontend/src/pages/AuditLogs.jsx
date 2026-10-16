import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';

// ============================================
// Smart School — Audit Logs Page
// ============================================
// صفحة عرض سجلات النظام (للإدارة فقط)
// - إحصائيات
// - فلترة
// - جدول السجلات
// - تفاصيل السجل
// ============================================

const ACTION_LABELS = {
  login: '🔐 تسجيل دخول',
  login_failed: '❌ دخول فاشل',
  logout: '🚪 تسجيل خروج',
  create: '➕ إنشاء',
  update: '✏️ تعديل',
  delete: '🗑️ حذف',
  view: '👁️ عرض',
  export: '📤 تصدير',
  approve: '✅ موافقة',
  reject: '❌ رفض',
  publish: '📢 نشر',
  settings_change: '⚙️ تعديل إعدادات',
};

const RESOURCE_LABELS = {
  auth: '🔑 مصادقة',
  user: '👤 مستخدم',
  attendance: '📍 حضور',
  leave: '🏖️ إجازة',
  payroll: '💰 مرتبات',
  announcement: '📢 إعلان',
  document: '📄 مستند',
  branch: '🏢 فرع',
  emergency: '🚨 طوارئ',
  qr: '📱 QR',
  settings: '⚙️ إعدادات',
  face: '🎭 Face',
};

const STATUS_COLORS = {
  success: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: '✅ نجح' },
  failed: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: '❌ فشل' },
  warning: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: '⚠️ تحذير' },
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  // ===== الفلاتر =====
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    status: '',
    search: '',
    from: '',
    to: '',
  });

  // ===== Pagination =====
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  // ============================================
  // ✅ جلب السجلات
  // ============================================
  const loadLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);

      const params = {
        page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== '')
        ),
      };

      const { data } = await api.get('/audit-logs', { params });

      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Load audit logs error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // ============================================
  // ✅ جلب الإحصائيات
  // ============================================
  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/audit-logs/stats');
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Load stats error:', err);
    }
  }, []);

  // ============================================
  // ✅ useEffect
  // ============================================
  useEffect(() => {
    loadLogs(1);
    loadStats();
  }, [loadLogs, loadStats]);

  // ============================================
  // ✅ تطبيق الفلاتر
  // ============================================
  const applyFilters = () => {
    loadLogs(1);
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      status: '',
      search: '',
      from: '',
      to: '',
    });
  };

  // ============================================
  // ✅ التاريخ
  // ============================================
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // ============================================
  // ✅ Render
  // ============================================
  return (
    <div className="audit-logs-page">
      {/* ===== Header ===== */}
      <div className="audit-header">
        <div>
          <h1>📋 سجلات النظام</h1>
          <p>تتبع كل العمليات الحساسة في النظام</p>
        </div>
        <button onClick={() => { loadLogs(pagination.page); loadStats(); }} className="audit-btn audit-btn-primary">
          🔄 تحديث
        </button>
      </div>

      {/* ===== Stats ===== */}
      {stats && (
        <div className="audit-stats">
          <div className="audit-stat-card">
            <span className="audit-stat-icon">📊</span>
            <div>
              <div className="audit-stat-value">{stats.total}</div>
              <div className="audit-stat-label">إجمالي العمليات</div>
            </div>
          </div>

          {stats.byStatus?.map((s) => {
            const statusInfo = STATUS_COLORS[s._id] || STATUS_COLORS.success;
            return (
              <div key={s._id} className="audit-stat-card" style={{ background: statusInfo.bg }}>
                <span className="audit-stat-icon">{statusInfo.label.split(' ')[0]}</span>
                <div>
                  <div className="audit-stat-value" style={{ color: statusInfo.color }}>
                    {s.count}
                  </div>
                  <div className="audit-stat-label">{statusInfo.label.split(' ')[1]}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Filters ===== */}
      <div className="audit-filters">
        <input
          type="text"
          placeholder="🔍 بحث (إيميل، اسم، وصف)..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
          className="audit-input"
        />

        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="audit-select"
        >
          <option value="">كل العمليات</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={filters.resource}
          onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
          className="audit-select"
        >
          <option value="">كل الموارد</option>
          {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="audit-select"
        >
          <option value="">كل الحالات</option>
          <option value="success">✅ نجح</option>
          <option value="failed">❌ فشل</option>
          <option value="warning">⚠️ تحذير</option>
        </select>

        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="audit-input"
          placeholder="من"
        />

        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="audit-input"
          placeholder="إلى"
        />

        <button onClick={applyFilters} className="audit-btn audit-btn-primary">
          🔍 بحث
        </button>

        <button onClick={clearFilters} className="audit-btn audit-btn-ghost">
          ✖️ مسح
        </button>
      </div>

      {/* ===== Table ===== */}
      <div className="audit-table-wrapper">
        {loading ? (
          <div className="audit-loading">⏳ جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">📭 لا توجد سجلات</div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>الوقت</th>
                <th>المستخدم</th>
                <th>العملية</th>
                <th>المورد</th>
                <th>الوصف</th>
                <th>الحالة</th>
                <th>IP</th>
                <th>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const statusInfo = STATUS_COLORS[log.status] || STATUS_COLORS.success;
                return (
                  <tr key={log._id}>
                    <td className="audit-date">{formatDate(log.timestamp)}</td>
                    <td>
                      <div className="audit-user">
                        <span>{log.userName || 'النظام'}</span>
                        {log.userEmail && (
                          <small>{log.userEmail}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="audit-action">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td>
                      <span className="audit-resource">
                        {RESOURCE_LABELS[log.resource] || log.resource}
                      </span>
                    </td>
                    <td className="audit-desc">{log.description || '-'}</td>
                    <td>
                      <span
                        className="audit-status"
                        style={{
                          background: statusInfo.bg,
                          color: statusInfo.color,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="audit-ip">{log.ip || '-'}</td>
                    <td>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="audit-btn audit-btn-small"
                      >
                        👁️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== Pagination ===== */}
      {pagination.pages > 1 && (
        <div className="audit-pagination">
          <button
            onClick={() => loadLogs(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="audit-btn audit-btn-ghost"
          >
            ← السابق
          </button>

          <span>
            صفحة {pagination.page} من {pagination.pages} ({pagination.total} سجل)
          </span>

          <button
            onClick={() => loadLogs(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="audit-btn audit-btn-ghost"
          >
            التالي →
          </button>
        </div>
      )}

      {/* ===== Details Modal ===== */}
      {selectedLog && (
        <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <h2>📋 تفاصيل السجل</h2>
              <button onClick={() => setSelectedLog(null)} className="audit-modal-close">✖️</button>
            </div>

            <div className="audit-modal-body">
              <div className="audit-detail-row">
                <strong>الوقت:</strong>
                <span>{formatDate(selectedLog.timestamp)}</span>
              </div>
              <div className="audit-detail-row">
                <strong>المستخدم:</strong>
                <span>{selectedLog.userName || 'النظام'}</span>
              </div>
              <div className="audit-detail-row">
                <strong>الإيميل:</strong>
                <span>{selectedLog.userEmail || '-'}</span>
              </div>
              <div className="audit-detail-row">
                <strong>الدور:</strong>
                <span>{selectedLog.userRole || '-'}</span>
              </div>
              <div className="audit-detail-row">
                <strong>العملية:</strong>
                <span>{ACTION_LABELS[selectedLog.action] || selectedLog.action}</span>
              </div>
              <div className="audit-detail-row">
                <strong>المورد:</strong>
                <span>{RESOURCE_LABELS[selectedLog.resource] || selectedLog.resource}</span>
              </div>
              <div className="audit-detail-row">
                <strong>الوصف:</strong>
                <span>{selectedLog.description || '-'}</span>
              </div>
              <div className="audit-detail-row">
                <strong>IP:</strong>
                <span>{selectedLog.ip || '-'}</span>
              </div>
              <div className="audit-detail-row">
                <strong>Endpoint:</strong>
                <span>{selectedLog.method} {selectedLog.endpoint || '-'}</span>
              </div>
              <div className="audit-detail-row">
                <strong>User Agent:</strong>
                <span style={{ fontSize: 12, wordBreak: 'break-all' }}>{selectedLog.userAgent || '-'}</span>
              </div>

              {selectedLog.details && (
                <div className="audit-detail-section">
                  <strong>تفاصيل إضافية:</strong>
                  <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .audit-logs-page {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          direction: rtl;
          color: #f8fafc;
        }

        .audit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .audit-header h1 {
          margin: 0;
          font-size: 24px;
        }

        .audit-header p {
          margin: 4px 0 0;
          opacity: 0.7;
          font-size: 14px;
        }

        .audit-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .audit-stat-card {
          background: rgba(15, 33, 56, 0.7);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .audit-stat-icon {
          font-size: 28px;
        }

        .audit-stat-value {
          font-size: 22px;
          font-weight: 700;
        }

        .audit-stat-label {
          font-size: 12px;
          opacity: 0.7;
        }

        .audit-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
          padding: 12px;
          background: rgba(15, 33, 56, 0.5);
          border-radius: 12px;
          border: 1px solid rgba(0, 229, 255, 0.15);
        }

        .audit-input,
        .audit-select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(0, 229, 255, 0.2);
          background: rgba(15, 33, 56, 0.8);
          color: #f8fafc;
          font-family: inherit;
          font-size: 13px;
          min-width: 120px;
        }

        .audit-input::placeholder {
          color: rgba(248, 250, 252, 0.4);
        }

        .audit-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .audit-btn-primary {
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          color: #fff;
        }

        .audit-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 229, 255, 0.4);
        }

        .audit-btn-ghost {
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .audit-btn-ghost:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .audit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .audit-btn-small {
          padding: 4px 8px;
          font-size: 14px;
          background: rgba(0, 229, 255, 0.15);
          color: #00e5ff;
        }

        .audit-table-wrapper {
          background: rgba(15, 33, 56, 0.7);
          border-radius: 12px;
          border: 1px solid rgba(0, 229, 255, 0.15);
          overflow: hidden;
          overflow-x: auto;
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .audit-table th {
          background: rgba(0, 229, 255, 0.08);
          padding: 12px 8px;
          text-align: right;
          font-weight: 700;
          border-bottom: 1px solid rgba(0, 229, 255, 0.15);
          white-space: nowrap;
        }

        .audit-table td {
          padding: 10px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          vertical-align: middle;
        }

        .audit-table tr:hover {
          background: rgba(0, 229, 255, 0.03);
        }

        .audit-date {
          font-size: 11px;
          white-space: nowrap;
          opacity: 0.8;
        }

        .audit-user {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .audit-user small {
          opacity: 0.6;
          font-size: 11px;
        }

        .audit-action,
        .audit-resource {
          white-space: nowrap;
          font-size: 12px;
        }

        .audit-desc {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .audit-status {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .audit-ip {
          font-family: monospace;
          font-size: 11px;
          opacity: 0.7;
        }

        .audit-loading,
        .audit-empty {
          padding: 60px 20px;
          text-align: center;
          opacity: 0.7;
          font-size: 15px;
        }

        .audit-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
          padding: 12px;
        }

        .audit-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .audit-modal {
          background: #0f2138;
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .audit-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 229, 255, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .audit-modal-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .audit-modal-close {
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
        }

        .audit-modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .audit-detail-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 13px;
        }

        .audit-detail-row strong {
          opacity: 0.7;
          min-width: 100px;
        }

        .audit-detail-row span {
          text-align: left;
          word-break: break-word;
          flex: 1;
        }

        .audit-detail-section {
          margin-top: 16px;
        }

        .audit-detail-section strong {
          display: block;
          margin-bottom: 8px;
          opacity: 0.7;
          font-size: 13px;
        }

        .audit-detail-section pre {
          background: rgba(0, 0, 0, 0.3);
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 12px;
          direction: ltr;
          text-align: left;
        }
      `}</style>
    </div>
  );
}