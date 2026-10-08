import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { io } from 'socket.io-client';

const EMERGENCY_TYPES = [
  { value: 'fire', label: '🔥 حريق', color: '#d9534f' },
  { value: 'medical', label: '🚑 حالة طبية', color: '#2e7d5b' },
  { value: 'security', label: '🔒 أمني', color: '#0a1f44' },
  { value: 'evacuation', label: '🚪 إخلاء', color: '#b8860b' },
  { value: 'other', label: '⚠️ أخرى', color: '#5a6478' },
];

export default function EmergencyButton() {
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('other');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [msg, setMsg] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ✅ نجيب الحالة النشطة لو موجودة
  const loadActive = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/emergency/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mine = data.find(e => String(e.user?._id) === String(user._id));
      setActiveEmergency(mine || null);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Socket.io للإشعارات
  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('register', user._id);
    });

    socket.on('emergency:resolved', (data) => {
      if (String(data.emergency?.user?._id || data.emergency?.user) === String(user._id)) {
        setActiveEmergency(null);
        setMsg('✅ تم إغلاق حالة الطوارئ');
      }
    });

    loadActive();

    return () => socket.disconnect();
  }, [token]);

  // ✅ إرسال حالة طوارئ
  const sendEmergency = async () => {
    setSending(true);
    setMsg('');

    // نجيب الموقع
    let location = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      } catch (err) {
        console.log('Location not available');
      }
    }

    try {
      const { data } = await axios.post(
        `${API_URL}/api/emergency`,
        {
          type: selectedType,
          message,
          location,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActiveEmergency(data.emergency);
      setMsg('🚨 تم إرسال حالة الطوارئ للمديرين');
      setShowModal(false);
      setMessage('');
      setSelectedType('other');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الإرسال'));
    } finally {
      setSending(false);
    }
  };

  // ✅ إلغاء الحالة النشطة
  const cancelEmergency = async () => {
    if (!activeEmergency) return;
    if (!window.confirm('هل أنت متأكد من إلغاء حالة الطوارئ؟')) return;

    try {
      await axios.put(
        `${API_URL}/api/emergency/${activeEmergency._id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveEmergency(null);
      setMsg('✅ تم إلغاء الحالة');
    } catch (err) {
      setMsg('❌ فشل الإلغاء');
    }
  };

  return (
    <>
      {/* الحالة النشطة */}
      {activeEmergency && (
        <div style={{
          background: 'linear-gradient(145deg, #d9534f, #a94442)',
          color: '#fff',
          padding: '16px 20px',
          borderRadius: 14,
          marginBottom: 16,
          boxShadow: '0 8px 24px rgba(217,83,79,0.4)',
          animation: 'pulse 2s infinite',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <b style={{ fontSize: 16 }}>🚨 حالة طوارئ نشطة</b>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                النوع: {EMERGENCY_TYPES.find(t => t.value === activeEmergency.type)?.label}
                {' · '}
                {new Date(activeEmergency.createdAt).toLocaleString('ar-EG')}
              </p>
            </div>
            <button
              onClick={cancelEmergency}
              style={{
                padding: '8px 16px',
                background: '#fff',
                color: '#d9534f',
                border: 'none',
                borderRadius: 8,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* الرسائل */}
      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') || msg.startsWith('🚨') ? '#d4edda' : '#f8d7da',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000',
          fontSize: 13,
        }}>{msg}</p>
      )}

      {/* زر الطوارئ - صغير وثابت على اليمين */}
      {!activeEmergency && (
        <button
          onClick={() => setShowModal(true)}
          title="زر الطوارئ"
          style={{
            position: 'fixed',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            zIndex: 9998,
            padding: '20px 10px',
            background: 'linear-gradient(145deg, #d9534f, #a94442)',
            color: '#fff',
            border: 'none',
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            fontSize: 13,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '-4px 0 16px rgba(217,83,79,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontFamily: 'inherit',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.paddingRight = '16px';
            e.currentTarget.style.boxShadow = '-6px 0 24px rgba(217,83,79,0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.paddingRight = '10px';
            e.currentTarget.style.boxShadow = '-4px 0 16px rgba(217,83,79,0.5)';
          }}
        >
          <span style={{ fontSize: 22 }}>🚨</span>
          <span style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            letterSpacing: 2,
          }}>
            طوارئ
          </span>
        </button>
      )}

      {/* Modal اختيار النوع */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <h3 style={{ color: '#d9534f', marginTop: 0, marginBottom: 8, textAlign: 'center' }}>
              🚨 تسجيل حالة طوارئ
            </h3>
            <p style={{ color: '#5a6478', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              سيتم إشعار جميع المديرين فوراً
            </p>

            {/* نوع الطوارئ */}
            <label style={{ fontSize: 13, color: '#0a1f44', fontWeight: 'bold' }}>نوع الطوارئ:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, margin: '8px 0 16px' }}>
              {EMERGENCY_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSelectedType(t.value)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: selectedType === t.value ? `2px solid ${t.color}` : '2px solid #e0e6ef',
                    background: selectedType === t.value ? t.color : '#fff',
                    color: selectedType === t.value ? '#fff' : '#0a1f44',
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* رسالة اختيارية */}
            <label style={{ fontSize: 13, color: '#0a1f44', fontWeight: 'bold' }}>رسالة (اختياري):</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب تفاصيل إضافية..."
              rows={3}
              maxLength={500}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                border: '2px solid #e0e6ef',
                fontSize: 13,
                marginTop: 6,
                marginBottom: 16,
                fontFamily: 'inherit',
                resize: 'vertical',
                direction: 'rtl',
              }}
            />

            {/* أزرار */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f5f7fa',
                  color: '#5a6478',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'inherit',
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={sendEmergency}
                disabled={sending}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: 'linear-gradient(145deg, #d9534f, #a94442)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 'bold',
                  cursor: sending ? 'wait' : 'pointer',
                  fontSize: 14,
                  fontFamily: 'inherit',
                }}
              >
                {sending ? '⏳ جاري الإرسال...' : '🚨 إرسال'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </>
  );
}