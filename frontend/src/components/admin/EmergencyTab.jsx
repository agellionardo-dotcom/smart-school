import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';
import { io } from 'socket.io-client';

const EMERGENCY_TYPES = {
  fire: { label: '🔥 حريق', color: '#d9534f' },
  medical: { label: '🚑 حالة طبية', color: '#2e7d5b' },
  security: { label: '🔒 أمني', color: '#0a1f44' },
  evacuation: { label: '🚪 إخلاء', color: '#b8860b' },
  other: { label: '⚠️ أخرى', color: '#5a6478' },
};

export default function EmergencyTab() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('active');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const headers = { Authorization: `Bearer ${token}` };

  // ✅ دالة تشغيل صوت التنبيه
  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const playTone = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      
      playTone(800, now, 0.3);
      playTone(600, now + 0.3, 0.3);
      playTone(800, now + 0.6, 0.3);
    } catch (err) {
      console.error('Audio error:', err);
    }
  };

  // ✅ جلب حالات الطوارئ
  const loadEmergencies = async () => {
    try {
      const url = filter === 'all'
        ? `${API_URL}/api/emergency`
        : `${API_URL}/api/emergency?status=${filter}`;
      const { data } = await axios.get(url, { headers });
      setEmergencies(data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل تحميل الحالات'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmergencies();
  }, [filter]);

  // ✅ Socket.io للإشعارات الفورية
  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('register', user._id);
    });

    socket.on('emergency:new', (data) => {
      setMsg(`🚨 حالة طوارئ جديدة: ${data.emergency?.user?.name || 'موظف'}`);
      
      // ✅ تشغيل الصوت
      playAlertSound();
      
      // ✅ اهتزاز (لو موبايل)
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
      
      loadEmergencies();
    });

    socket.on('emergency:resolved', () => {
      loadEmergencies();
    });

    return () => socket.disconnect();
  }, [token]);

  // ✅ إغلاق حالة طوارئ
  const resolveEmergency = async (id) => {
    const notes = window.prompt('ملاحظات (اختياري):');
    if (notes === null) return;

    try {
      await axios.put(
        `${API_URL}/api/emergency/${id}/resolve`,
        { notes: notes || '' },
        { headers }
      );
      setMsg('✅ تم إغلاق الحالة');
      loadEmergencies();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الإغلاق'));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>
          🚨 حالات الطوارئ ({emergencies.length})
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn gray"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={playAlertSound}
            title="اختبار الصوت"
          >
            🔊 اختبار الصوت
          </button>
          <button
            className="btn gray"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={loadEmergencies}
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'active', label: '🚨 النشطة', color: '#d9534f' },
          { key: 'resolved', label: '✅ المُغلقة', color: '#2e7d5b' },
          { key: 'all', label: '📋 الكل', color: '#0a1f44' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: filter === f.key ? f.color : '#fff',
              color: filter === f.key ? '#fff' : 'var(--navy)',
              fontSize: 13,
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontFamily: 'inherit',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : msg.startsWith('🚨') ? '#fff3cd' : '#f8d7da',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000',
          fontSize: 13,
        }}>{msg}</p>
      )}

      <div className="glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>⏳ جاري التحميل...</p>
        ) : emergencies.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>
            {filter === 'active' ? '✅ لا توجد حالات طوارئ نشطة' : 'لا توجد حالات'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {emergencies.map(e => {
              const type = EMERGENCY_TYPES[e.type] || EMERGENCY_TYPES.other;
              const isActive = e.status === 'active';
              return (
                <div
                  key={e._id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: isActive ? 'linear-gradient(145deg, #fff5f5, #ffe8e8)' : '#f5f7fa',
                    border: isActive ? `2px solid ${type.color}` : '1px solid #e0e6ef',
                    boxShadow: isActive ? `0 4px 16px ${type.color}22` : '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          background: type.color,
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}>
                          {type.label}
                        </span>
                        <span style={{
                          background: isActive ? '#d9534f' : '#2e7d5b',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}>
                          {isActive ? '🚨 نشطة' : '✅ مُغلقة'}
                        </span>
                      </div>

                      <p style={{ margin: '4px 0', fontSize: 14, color: '#0a1f44', fontWeight: 'bold' }}>
                        👤 {e.user?.name || 'موظف'}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: 12, color: '#5a6478' }}>
                        🏢 {e.branch?.name || '-'}
                        {e.user?.phone && ` · 📞 ${e.user.phone}`}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: 12, color: '#5a6478' }}>
                        🕐 {new Date(e.createdAt).toLocaleString('ar-EG')}
                      </p>

                      {e.message && (
                        <p style={{
                          margin: '8px 0 0',
                          padding: 8,
                          background: '#fff',
                          borderRadius: 8,
                          fontSize: 13,
                          color: '#0a1f44',
                        }}>
                          💬 {e.message}
                        </p>
                      )}

                      {e.location?.lat && (
                        <a
                          href={`https://www.google.com/maps?q=${e.location.lat},${e.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: 8,
                            padding: '6px 12px',
                            background: '#0a1f44',
                            color: '#fff',
                            borderRadius: 8,
                            fontSize: 12,
                            textDecoration: 'none',
                          }}
                        >
                          📍 عرض الموقع على الخريطة
                        </a>
                      )}

                      {e.status === 'resolved' && e.resolvedBy && (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#2e7d5b' }}>
                          ✅ أُغلقت بواسطة: {e.resolvedBy.name}
                          {e.resolvedAt && ` · ${new Date(e.resolvedAt).toLocaleString('ar-EG')}`}
                        </p>
                      )}

                      {e.notes && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#5a6478' }}>
                          📝 {e.notes}
                        </p>
                      )}
                    </div>

                    {isActive && (
                      <button
                        onClick={() => resolveEmergency(e._id)}
                        style={{
                          padding: '10px 20px',
                          background: 'linear-gradient(145deg, #2e7d5b, #1e5a40)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontFamily: 'inherit',
                        }}
                      >
                        ✅ إغلاق الحالة
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}