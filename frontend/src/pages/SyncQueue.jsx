import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import {
  getQueue,
  removeFromQueue,
  clearQueue,
  updateQueueItem,
  setLastSync,
  getLastSync,
} from '../services/offlineStorage';
import { isOnline } from '../services/networkStatus';

export default function SyncQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [lastSync, setLastSyncState] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ✅ تحميل الطلبات
  const loadQueue = async () => {
    const items = await getQueue();
    setQueue(items);
    const last = await getLastSync();
    setLastSyncState(last);
    setLoading(false);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // ✅ مزامنة الطلبات
  const syncAll = async () => {
    const online = await isOnline();
    if (!online) {
      setMsg('📴 لا يوجد اتصال بالإنترنت');
      return;
    }

    setSyncing(true);
    setMsg('');

    let success = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        await updateQueueItem(item.id, { status: 'syncing' });

        const endpoint = item.type === 'checkin' ? 'checkin' : 'checkout';
        await axios.post(
          `${API_URL}/api/attendance/${endpoint}`,
          { lat: item.lat, lng: item.lng },
          { headers }
        );

        await removeFromQueue(item.id);
        success++;
      } catch (err) {
        failed++;
        await updateQueueItem(item.id, {
          status: 'failed',
          attempts: (item.attempts || 0) + 1,
          error: err.response?.data?.msg || err.message,
        });
      }
    }

    await setLastSync();
    await loadQueue();
    setSyncing(false);

    setMsg(`✅ تم مزامنة ${success} طلب · ❌ فشل ${failed} طلب`);
  };

  // ✅ مسح كل الطلبات
  const clearAll = async () => {
    if (!window.confirm('هل تريد مسح كل الطلبات المعلقة؟')) return;
    await clearQueue();
    await loadQueue();
    setMsg('🗑️ تم مسح كل الطلبات');
  };

  if (loading) {
    return <div className="dashboard"><p style={{ textAlign: 'center', padding: 40 }}>⏳ جاري التحميل...</p></div>;
  }

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>🔄 المزامنة</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>
        الطلبات المعلقة: {queue.length}
        {lastSync && ` · آخر مزامنة: ${new Date(lastSync).toLocaleString('ar-EG')}`}
      </p>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : msg.startsWith('📴') ? '#fff3cd' : '#f8d7da',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000',
          fontSize: 13,
        }}>{msg}</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className="btn"
          onClick={syncAll}
          disabled={syncing || queue.length === 0}
          style={{ flex: 1, minWidth: 150 }}
        >
          {syncing ? '⏳ جاري المزامنة...' : `🔄 مزامنة الكل (${queue.length})`}
        </button>
        <button
          className="btn gray"
          onClick={clearAll}
          disabled={queue.length === 0}
          style={{ flex: 1, minWidth: 150 }}
        >
          🗑️ مسح الكل
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 40 }}>✅</p>
          <p style={{ color: 'var(--gray)' }}>لا توجد طلبات معلقة</p>
        </div>
      ) : (
        <div className="glass" style={{ padding: 20 }}>
          {queue.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 12,
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: 'var(--navy)' }}>
                  {item.type === 'checkin' ? '📥 حضور' : '📤 انصراف'}
                </div>
                <div style={{ fontSize: 11, color: '#5a6478' }}>
                  🕐 {new Date(item.timestamp).toLocaleString('ar-EG')}
                </div>
                {item.error && (
                  <div style={{ fontSize: 11, color: '#8e2b2b' }}>
                    ❌ {item.error}
                  </div>
                )}
              </div>
              <span style={{
                background:
                  item.status === 'failed' ? '#8e2b2b' :
                  item.status === 'syncing' ? '#b8860b' :
                  '#5a6478',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 'bold',
              }}>
                {item.status === 'failed' ? '❌ فشل' :
                 item.status === 'syncing' ? '⏳ جاري' :
                 '⏸️ معلق'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}