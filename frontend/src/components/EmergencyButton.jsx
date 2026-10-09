import React, { useEffect, useState } from 'react';
import api, { API_URL } from '../api';
import { io } from 'socket.io-client';

const EMERGENCY_TYPES = [
  { value: 'fire', label: '🔥 حريق', color: '#d9534f' },
  { value: 'medical', label: '🚑 حالة طبية', color: '#2e7d5b' },
  { value: 'security', label: '🔒 أمني', color: '#0a1f44' },
  { value: 'other', label: '⚠️ أخرى', color: '#5a6478' },
];

export default function EmergencyButton() {
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('fire');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ✅ جلب الحالة النشطة
  useEffect(() => {
    if (!token) return;
    api.get('/emergency/active')
      .then(r => setActiveEmergency(r.data))
      .catch(() => setActiveEmergency(null));
  }, [token]);

  // ✅ Socket.io
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL.replace('/api', ''), { transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('register', user._id));

    socket.on('emergency:resolved', () => {
      setActiveEmergency(null);
    });

    return () => socket.disconnect();
  }, [token]);

  const sendEmergency = async () => {
    setSending(true);
    setMsg('');
    try {
      let location = null;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) { console.warn('GPS unavailable'); }

      const { data } = await api.post('/emergency', {
        type: selectedType,
        message,
        location,
      });

      setActiveEmergency(data);
      setShowModal(false);
      setMessage('');
      setMsg('✅ تم إرسال التنبيه');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الإرسال'));
    } finally {
      setSending(false);
    }
  };

  const cancelEmergency = async () => {
    if (!activeEmergency || !window.confirm('إلغاء التنبيه؟')) return;
    try {
      await api.put(`/emergency/${activeEmergency._id}/cancel`, {});
      setActiveEmergency(null);
      setMsg('✅ تم الإلغاء');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الإلغاء'));
    }
  };

  return (
    <>
      {activeEmergency ? (
        <button
          onClick={cancelEmergency}
          style={{
            position: 'fixed', bottom: 80, left: 20, zIndex: 9999,
            padding: '14px 20px',
            background: 'linear-gradient(145deg, #d9534f, #a94442)',
            color: '#fff', border: 'none', borderRadius: 30,
            fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(217,83,79,0.5)',
            fontFamily: 'inherit',
            animation: 'pulse 1.5s infinite',
          }}
          title="اضغط لإلغاء التنبيه"
        >
          🚨 طوارئ نشطة — إلغاء
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          style={{
            position: 'fixed', bottom: 80, left: 20, zIndex: 9999,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(145deg, #d9534f, #a94442)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 24, boxShadow: '0 6px 20px rgba(217,83,79,0.5)',
          }}
          title="طوارئ"
        >
          🚨
        </button>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: 16,
        }} onClick={() => !sending && setShowModal(false)}>
          <div className="glass" style={{ padding: 24, maxWidth: 400, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#8e2b2b', marginBottom: 16 }}>🚨 إرسال تنبيه طوارئ</h3>

            <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 12 }}>
              اختر نوع الطارئ:
            </p>

            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              {EMERGENCY_TYPES.map(t => (
                <button key={t.value} onClick={() => setSelectedType(t.value)}
                  style={{
                    padding: 12, borderRadius: 10, border: 'none',
                    background: selectedType === t.value ? t.color : '#f5f7fa',
                    color: selectedType === t.value ? '#fff' : 'var(--navy)',
                    fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'right',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            <textarea className="input" placeholder="رسالة (اختياري)"
              value={message} onChange={e => setMessage(e.target.value)}
              rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            <br /><br />

            {msg && (
              <p style={{ padding: 10, background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da', borderRadius: 8, fontSize: 13, color: '#000', marginBottom: 12 }}>
                {msg}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={sendEmergency} disabled={sending}
                style={{ flex: 1, background: 'linear-gradient(145deg, #d9534f, #a94442)' }}>
                {sending ? '⏳ جاري...' : '🚨 إرسال'}
              </button>
              <button className="btn gray" onClick={() => setShowModal(false)} disabled={sending}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}