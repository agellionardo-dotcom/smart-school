import { toCairo } from '../../utils/dateHelpers';
import React, { useEffect, useState } from 'react';
import api, { API_URL } from '../../api';
import { io } from 'socket.io-client';

const EMERGENCY_TYPES = {
  fire:       { label: '🔥 حريق',      gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  medical:    { label: '🚑 حالة طبية', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  security:   { label: '🔒 أمني',       gradient: 'linear-gradient(135deg, #3b82f6, #1e40af)' },
  evacuation: { label: '🚪 إخلاء',      gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  other:      { label: '⚠️ أخرى',       gradient: 'linear-gradient(135deg, #94a3b8, #64748b)' },
};

export default function EmergencyTab() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [filter, setFilter] = useState('active');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const showMsg = (text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
  };

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

  const loadEmergencies = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' ? '/emergency' : `/emergency?status=${filter}`;
      const { data } = await api.get(url);
      setEmergencies(data);
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.msg || 'فشل تحميل الحالات'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmergencies();
  }, [filter]);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => socket.emit('register', user._id));
    socket.on('emergency:new', (data) => {
      showMsg(`🚨 حالة طوارئ جديدة: ${data.emergency?.user?.name || 'موظف'}`, 'warning');
      playAlertSound();
      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
      loadEmergencies();
    });
    socket.on('emergency:resolved', () => loadEmergencies());
    return () => socket.disconnect();
  }, [token]);

  const resolveEmergency = async (id) => {
    const notes = window.prompt('ملاحظات (اختياري):');
    if (notes === null) return;
    try {
      await api.put(`/emergency/${id}/resolve`, { notes: notes || '' });
      showMsg('✅ تم إغلاق الحالة', 'success');
      loadEmergencies();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.msg || 'فشل الإغلاق'), 'error');
    }
  };

  return (
    <div>
      {/* ✅ Header */}
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
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          🚨 حالات الطوارئ ({emergencies.length})
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn gray"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={playAlertSound}
          >
            🔊 اختبار الصوت
          </button>
          <button
            className="btn gray"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={loadEmergencies}
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* ✅ Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'active',   label: '🚨 النشطة',  gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
          { key: 'resolved', label: '✅ المُغلقة', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
          { key: 'all',      label: '📋 الكل',     gradient: 'linear-gradient(135deg, #00e5ff, #a855f7)' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`admin-tab ${filter === f.key ? 'active' : ''}`}
            style={{ fontSize: 13 }}
          >
            {f.label}
          </button>
        ))}
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
                : msgType === 'warning'
                ? 'rgba(251, 191, 36, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            color:
              msgType === 'success'
                ? '#34d399'
                : msgType === 'warning'
                ? '#fcd34d'
                : '#fca5a5',
            border: `1px solid ${
              msgType === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : msgType === 'warning'
                ? 'rgba(251, 191, 36, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ List */}
      <div className="ss-glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            ⏳ جاري التحميل...
          </p>
        ) : emergencies.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
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
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.08))'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isActive
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isActive
                      ? '0 4px 24px rgba(239, 68, 68, 0.2)'
                      : '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          className="payroll-status"
                          style={{ background: type.gradient }}
                        >
                          {type.label}
                        </span>
                        <span
                          className="payroll-status"
                          style={{
                            background: isActive
                              ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                              : 'linear-gradient(135deg, #10b981, #059669)',
                          }}
                        >
                          {isActive ? '🚨 نشطة' : '✅ مُغلقة'}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: '4px 0',
                          fontSize: 15,
                          color: '#f8fafc',
                          fontWeight: 700,
                        }}
                      >
                        👤 {e.user?.name || 'موظف'}
                      </p>
                      <p
                        style={{
                          margin: '4px 0',
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.65)',
                        }}
                      >
                        🏢 {e.branch?.name || '-'}
                        {e.user?.phone && ` · 📞 ${e.user.phone}`}
                      </p>
                      <p
                        style={{
                          margin: '4px 0',
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.55)',
                        }}
                      >
                        🕐 {toCairo(e.createdAt)}
                      </p>

                      {e.message && (
                        <p
                          style={{
                            margin: '8px 0 0',
                            padding: 10,
                            background: 'rgba(255, 255, 255, 0.06)',
                            borderRadius: 8,
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          💬 {e.message}
                        </p>
                      )}

                      {e.location?.lat && (
                        <a
                          href={`https://www.google.com/maps?q=${e.location.lat},${e.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn gray"
                          style={{
                            display: 'inline-block',
                            marginTop: 10,
                            padding: '8px 14px',
                            fontSize: 12,
                            textDecoration: 'none',
                          }}
                        >
                          📍 عرض الموقع على الخريطة
                        </a>
                      )}

                      {e.status === 'resolved' && e.resolvedBy && (
                        <p
                          style={{
                            margin: '8px 0 0',
                            fontSize: 12,
                            color: '#34d399',
                          }}
                        >
                          ✅ أُغلقت بواسطة: {e.resolvedBy.name}
                          {e.resolvedAt && ` · ${toCairo(e.resolvedAt)}`}
                        </p>
                      )}

                      {e.notes && (
                        <p
                          style={{
                            margin: '6px 0 0',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        >
                          📝 {e.notes}
                        </p>
                      )}
                    </div>

                    {isActive && (
                      <button
                        className="btn green"
                        onClick={() => resolveEmergency(e._id)}
                        style={{ padding: '10px 20px', fontSize: 13 }}
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