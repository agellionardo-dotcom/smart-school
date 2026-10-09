import React, { useEffect, useState } from 'react';
import api from '../api';
import { getQueue, removeFromQueue } from '../services/offlineStorage';
import { isOnline } from '../services/networkStatus';

export default function SyncQueue() {
  const [queue, setQueue] = useState([]);
  const [msg, setMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  const loadQueue = async () => {
    const items = await getQueue();
    setQueue(items);
  };

  useEffect(() => { loadQueue(); }, []);

  const syncAll = async () => {
    if (queue.length === 0) return;
    setSyncing(true);
    setMsg('⏳ جاري المزامنة...');

    let success = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const endpoint = item.type === 'checkin' ? '/attendance/checkin' : '/attendance/checkout';
        await api.post(endpoint, { lat: item.lat, lng: item.lng });
        await removeFromQueue(item.id);
        success++;
      } catch (err) {
        failed++;
        console.warn('sync item failed:', err.message);
      }
    }

    setSyncing(false);
    setMsg(`✅ نجح: ${success} · فشل: ${failed}`);
    await loadQueue();
  };

  const clearAll = async () => {
    if (!window.confirm('مسح كل الطلبات المعلقة؟')) return;
    for (const item of queue) {
      await removeFromQueue(item.id);
    }
    await loadQueue();
    setMsg('✅ تم المسح');
  };

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>⏳ قائمة المزامنة</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>
        الطلبات المعلقة اللي اتحفظت أوفلاين
      </p>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : msg.startsWith('⏳') ? '#fff3cd' : '#f8d7da',
          borderRadius: 8, marginBottom: 16, color: '#000'
        }}>{msg}</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn" onClick={syncAll} disabled={syncing || queue.length === 0}>
          {syncing ? '⏳ جاري...' : '🔄 مزامنة الكل'}
        </button>
        <button className="btn" onClick={loadQueue} style={{ background: '#8b95a7' }}>
          🔄 تحديث
        </button>
        <button className="btn" onClick={clearAll} style={{ background: '#8e2b2b' }}>
          🗑️ مسح الكل
        </button>
      </div>

      <div className="glass" style={{ padding: 20 }}>
        <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>
          الطلبات المعلقة ({queue.length})
        </h3>
        {queue.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>
            ✅ مفيش طلبات معلقة — كل حاجة متزامنة
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {queue.map(item => (
              <div key={item.id} style={{
                padding: 12, borderRadius: 10, background: '#fff',
                border: '1px solid #e0e6ef', display: 'flex', justifyContent: 'space-between',
              }}>
                <span><b>{item.type === 'checkin' ? '📥 حضور' : '📤 انصراف'}</b></span>
                <span style={{ fontSize: 12, color: '#5a6478' }}>
                  📍 {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}