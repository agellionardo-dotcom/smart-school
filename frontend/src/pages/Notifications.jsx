// 📁 frontend/src/pages/Notifications.jsx
// ⬅️ استبدل الملف بالكامل

import React, { useEffect, useState } from 'react';
import api from '../api';
import { toCairo } from '../utils/dateHelpers';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadNotifications = async () => {
    try {
      const { data } = await api.get('/in-app-notifications');
      setNotifications(data);
    } catch (err) {
      console.error('loadNotifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/in-app-notifications/${id}/read`);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/in-app-notifications/read-all');
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ الموافقة / الرفض
  const handleLeaveAction = async (leaveId, status, notificationId) => {
    const rejectionReason = status === 'rejected'
      ? window.prompt('سبب الرفض (اختياري):') || ''
      : undefined;

    setProcessingId(notificationId);

    try {
      await api.put(`/leaves/${leaveId}`, {
        status,
        rejectionReason,
      });

      // ✅ تعليم الإشعار كمقروء
      await api.put(`/in-app-notifications/${notificationId}/read`);

      // ✅ تحديث القائمة
      await loadNotifications();

      alert(status === 'approved' ? '✅ تمت الموافقة' : '❌ تم الرفض');
    } catch (err) {
      console.error('leave action error:', err);
      alert('❌ فشل: ' + (err.response?.data?.msg || err.message));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--ss-text-muted)' }}>
          ⏳ جاري التحميل...
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
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
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ss-text-primary)', margin: 0 }}>
          🔔 الإشعارات
        </h1>
        {notifications.length > 0 && (
          <button
            className="btn gray"
            onClick={markAllRead}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            ✅ تعليم الكل كمقروء
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div
          className="ss-glass"
          style={{ padding: 40, textAlign: 'center', color: 'var(--ss-text-muted)' }}
        >
          <p style={{ fontSize: 48, margin: 0 }}>🔔</p>
          <p style={{ marginTop: 12 }}>لا توجد إشعارات</p>
        </div>
      ) : (
        notifications.map((n) => {
          const isLeaveRequest = n.type === 'leave_request';
          const data = n.data || {};
          const isProcessing = processingId === n._id;

          return (
            <div
              key={n._id}
              className="ss-glass"
              style={{
                padding: 16,
                marginBottom: 12,
                borderRight: n.read ? '3px solid transparent' : '3px solid #a855f7',
                opacity: n.read ? 0.85 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, color: 'var(--ss-text-primary)', fontSize: 15 }}>
                    {n.title}
                  </h4>
                  <p style={{ margin: '4px 0 0', color: 'var(--ss-text-secondary)', fontSize: 13 }}>
                    {n.message}
                  </p>

                  {/* ✅ تفاصيل الموظف والإجازة */}
                  {isLeaveRequest && data.employeeName && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        background: 'var(--ss-bg-surface)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--ss-text-secondary)',
                        direction: 'rtl',
                      }}
                    >
                      <div><b>👤 الموظف:</b> {data.employeeName}</div>
                      <div><b>🏢 الفرع:</b> {data.employeeBranch || '—'}</div>
                      <div><b>📋 النوع:</b> {data.leaveType || '—'}</div>
                      {data.startDate && (
                        <div>
                          <b>📅 من:</b> {new Date(data.startDate).toLocaleDateString('ar-EG')}
                          {' '} <b>إلى:</b> {new Date(data.endDate).toLocaleDateString('ar-EG')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span style={{ fontSize: 11, color: 'var(--ss-text-muted)', whiteSpace: 'nowrap' }}>
                  {toCairo(n.createdAt)}
                </span>
              </div>

              {/* ✅ أزرار الموافقة/الرفض للإجازات غير المقروءة */}
              {isLeaveRequest && data.leaveId && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    className="btn green"
                    style={{ padding: '8px 16px', fontSize: 13, flex: 1 }}
                    disabled={isProcessing}
                    onClick={() => handleLeaveAction(data.leaveId, 'approved', n._id)}
                  >
                    {isProcessing ? '⏳' : '✅ موافقة'}
                  </button>
                  <button
                    className="btn danger"
                    style={{ padding: '8px 16px', fontSize: 13, flex: 1 }}
                    disabled={isProcessing}
                    onClick={() => handleLeaveAction(data.leaveId, 'rejected', n._id)}
                  >
                    {isProcessing ? '⏳' : '❌ رفض'}
                  </button>
                </div>
              )}

              {/* ✅ لو الإشعار مقروء → زرار تعليم كمقروء فقط */}
              {!n.read && !isLeaveRequest && (
                <button
                  className="btn gray"
                  style={{ marginTop: 12, padding: '6px 12px', fontSize: 12 }}
                  onClick={() => markAsRead(n._id)}
                >
                  ✅ تعليم كمقروء
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}