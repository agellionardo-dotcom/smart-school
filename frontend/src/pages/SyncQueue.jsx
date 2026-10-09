import React, { useEffect, useState } from 'react';
import api from '../api';
import { getQueue, removeFromQueue } from '../services/offlineStorage';
import { isOnline } from '../services/networkStatus';

export default function SyncQueue() {
  const [queue, setQueue] = useState([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [syncing, setSyncing] = useState(false);

  const showMsg = (text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
  };

  const loadQueue = async () => {
    const items = await getQueue();
    setQueue(items);
  };

  useEffect(() => { loadQueue(); }, []);

  const syncAll = async () => {
    if (queue.length === 0) return;
    setSyncing(true);
    showMsg('⏳ جاري المزامنة...', 'info');

    let success = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const endpoint =
          item.type === 'checkin' ? '/attendance/checkin' : '/attendance/checkout';
        await api.post(endpoint, { lat: item.lat, lng: item.lng });
        await removeFromQueue(item.id);
        success++;
      } catch (err) {
        failed++;
        console.warn('sync item failed:', err.message);
      }
    }

    setSyncing(false);
    showMsg(`✅ نجح: ${success} · فشل: ${failed}`, success > 0 ? 'success' : 'error');
    await loadQueue();
  };

  const clearAll = async () => {
    if (!window.confirm('مسح كل الطلبات المعلقة؟')) return;
    for (const item of queue) {
      await removeFromQueue(item.id);
    }
    await loadQueue();
    showMsg('✅ تم المسح', 'success');
  };

  return (
    <div className="dashboard">
      {/* ✅ Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            marginBottom: 8,
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          ⏳ قائمة المزامنة
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 14 }}>
          الطلبات المعلقة اللي اتحفظت أوفلاين
        </p>
      </div>

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
            background:
              msgType === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : msgType === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(251, 191, 36, 0.15)',
            color:
              msgType === 'success'
                ? '#34d399'
                : msgType === 'error'
                ? '#fca5a5'
                : '#fcd34d',
            border: `1px solid ${
              msgType === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : msgType === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(251, 191, 36, 0.3)'
            }`,
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className="btn"
          onClick={syncAll}
          disabled={syncing || queue.length === 0}
        >
          {syncing ? '⏳ جاري...' : '🔄 مزامنة الكل'}
        </button>
        <button className="btn gray" onClick={loadQueue}>
          🔄 تحديث
        </button>
        <button
          className="btn danger"
          onClick={clearAll}
          disabled={queue.length === 0}
        >
          🗑️ مسح الكل
        </button>
      </div>

      {/* ✅ Queue */}
      <div className="ss-glass" style={{ padding: 20 }}>
        <h3
          style={{
            color: '#f8fafc',
            marginBottom: 16,
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          الطلبات المعلقة ({queue.length})
        </h3>

        {queue.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p
              style={{
                color: '#34d399',
                fontSize: 15,
                fontWeight: 600,
                margin: 0,
              }}
            >
              مفيش طلبات معلقة — كل حاجة متزامنة
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {queue.map(item => (
              <div
                key={item.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>
                    {item.type === 'checkin' ? '📥' : '📤'}
                  </span>
                  <div>
                    <div
                      style={{
                        color: '#f8fafc',
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 2,
                      }}
                    >
                      {item.type === 'checkin' ? 'تسجيل حضور' : 'تسجيل انصراف'}
                    </div>
                    {item.timestamp && (
                      <div
                        style={{
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: 11,
                          fontFamily: 'monospace',
                        }}
                      >
                        {new Date(item.timestamp).toLocaleString('ar-EG')}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    direction: 'ltr',
                  }}
                >
                  📍 {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}