// 📁 frontend/src/pages/Notifications.jsx
// ⬅️ ملف جديد

import React, { useEffect, useState } from 'react';
import api from '../api';
import { toCairo } from '../utils/dateHelpers';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      // ✅ بنستخدم مسار in-app عشان منتعارضش مع Firebase
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
        notifications.map((n) => (
          <div
            key={n._id}
            className="ss-glass"
            style={{
              padding: 16,
              marginBottom: 12,
              borderRight: n.read ? '3px solid transparent' : '3px solid #a855f7',
              cursor: 'pointer',
              opacity: n.read ? 0.7 : 1,
            }}
            onClick={() => !n.read && markAsRead(n._id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--ss-text-primary)', fontSize: 15 }}>
                  {n.title}
                </h4>
                <p style={{ margin: '4px 0 0', color: 'var(--ss-text-secondary)', fontSize: 13 }}>
                  {n.message}
                </p>
              </div>
              <span style={{ fontSize: 11, color: 'var(--ss-text-muted)', whiteSpace: 'nowrap' }}>
                {toCairo(n.createdAt)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}