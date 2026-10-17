// 📁 frontend/src/components/superadmin/AuditLogTab.jsx
// ⬅️ ملف جديد — سجل النظام (كل الشركات)

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

const ACTION_COLORS = {
  CREATE: '#34d399',
  UPDATE: '#60a5fa',
  DELETE: '#fca5a5',
  LOGIN:  '#a855f7',
  LOGOUT: '#94a3b8',
  READ:   '#fcd34d',
  IMPORT: '#f59e0b',
  EXPORT: '#06b6d4',
};

export default function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    action: '',
    status: '',
    page: 1,
    limit: 50,
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);

      const { data } = await api.get('/superadmin/audit-logs', { params });
      setLogs(data.data || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error('loadLogs error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/superadmin/audit-logs/stats');
      setStats(data);
    } catch (err) {
      console.error('loadStats error:', err);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStats();
  }, []);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, page: key === 'page' ? value : 1 }));
  };

  return (
    <div>
      {/* ✅ Stats */}
      {stats && stats.total > 0 && (
        <div className="grid" style={{ marginBottom: 24 }}>
          <div className="superadmin-stat-card">
            <h3>{stats.total}</h3>
            <p>إجمالي الأحداث (7 أيام)</p>
          </div>
          {stats.byStatus?.map((s) => (
            <div
              key={s._id}
              className={`superadmin-stat-card ${
                s._id === 'success' ? 'success' : 'danger'
              }`}
            >
              <h3>{s.count}</h3>
              <p>{s._id === 'success' ? '✅ ناجحة' : '❌ فاشلة'}</p>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Filters */}
      <div
        className="ss-glass"
        style={{
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <input
          className="input"
          placeholder="🔍 بحث (إيميل، اسم، وصف، endpoint)"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />

        <select
          className="input"
          value={filters.action}
          onChange={(e) => setFilter('action', e.target.value)}
          style={{ minWidth: 140 }}
        >
          <option value="">كل الأحداث</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="READ">READ</option>
        </select>

        <select
          className="input"
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          style={{ minWidth: 120 }}
        >
          <option value="">كل الحالات</option>
          <option value="success">ناجح</option>
          <option value="failure">فاشل</option>
        </select>
      </div>

      {/* ✅ Logs */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--ss-text-muted)', padding: 40 }}>
          ⏳ جاري التحميل...
        </p>
      ) : logs.length === 0 ? (
        <div
          className="ss-glass"
          style={{ padding: 40, textAlign: 'center', color: 'var(--ss-text-muted)' }}
        >
          <p style={{ fontSize: 48, margin: 0 }}>📋</p>
          <p style={{ marginTop: 12 }}>لا توجد سجلات</p>
        </div>
      ) : (
        <>
          {logs.map((log) => (
            <div key={log._id} className="superadmin-log-row">
              <span
                className="superadmin-status"
                style={{
                  background: `${ACTION_COLORS[log.action] || '#94a3b8'}22`,
                  color: ACTION_COLORS[log.action] || '#94a3b8',
                  border: `1px solid ${ACTION_COLORS[log.action] || '#94a3b8'}66`,
                }}
              >
                {log.action}
              </span>

              <span style={{ flex: 1, minWidth: 200 }}>
                <b>{log.userName || log.user?.name || 'System'}</b>
                {log.userEmail && (
                  <span style={{ color: 'var(--ss-text-muted)', marginRight: 6 }}>
                    ({log.userEmail})
                  </span>
                )}
                {log.description && (
                  <div style={{ fontSize: 12, color: 'var(--ss-text-secondary)', marginTop: 4 }}>
                    {log.description}
                  </div>
                )}
              </span>

              {log.companyId?.name && (
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#a855f7',
                  }}
                >
                  🏢 {log.companyId.name}
                </span>
              )}

              <span
                className={`superadmin-status ${log.status === 'success' ? 'active' : 'suspended'}`}
              >
                {log.status === 'success' ? '✅' : '❌'}
              </span>

              <span className="superadmin-log-time">
                {new Date(log.timestamp).toLocaleString('ar-EG', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          ))}

          {/* ✅ Pagination */}
          {pagination.pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                marginTop: 24,
              }}
            >
              <button
                className="btn gray"
                disabled={pagination.page <= 1}
                onClick={() => setFilter('page', pagination.page - 1)}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                ← السابق
              </button>
              <span style={{ color: 'var(--ss-text-secondary)', fontSize: 13 }}>
                صفحة {pagination.page} من {pagination.pages} ({pagination.total} سجل)
              </span>
              <button
                className="btn gray"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setFilter('page', pagination.page + 1)}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                التالي →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}