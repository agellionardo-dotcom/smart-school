import React, { useState, useEffect } from 'react';
import api from '../../api';

export default function SettingsTab() {
  const [settings, setSettings] = useState({
    schoolName: 'Smart School',
    logoText: '🎓',
    primaryColor: '#0a1f44',
    secondaryColor: '#8b95a7',
    workStartTime: '08:30',
    workEndTime: '17:00',
    lateGraceMinutes: 0,
    enableQRCode: false,
    enableFaceRecognition: false,
    enableGeoFence: true,
    defaultRadius: 5,
  });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/admin/settings')
      .then(r => setSettings(prev => ({ ...prev, ...r.data })))
      .catch((err) => console.error('loadSettings error:', err));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/settings', settings);
      setMsg('✅ تم حفظ الإعدادات');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل'));
    }
  };

  const sectionTitle = {
    color: '#67e8f9',
    marginTop: 24,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const labelStyle = {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: 600,
    display: 'block',
    marginBottom: 6,
  };

  const checkLabel = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'all 0.2s',
  };

  return (
    <div>
      {/* ✅ Header */}
      <h3
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
        }}
      >
        ⚙️ إعدادات التطبيق
      </h3>

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
            background: msg.startsWith('✅')
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: msg.startsWith('✅') ? '#34d399' : '#fca5a5',
            border: `1px solid ${
              msg.startsWith('✅')
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      <form onSubmit={save} className="ss-glass" style={{ padding: 24 }}>
        {/* 🏫 School Info */}
        <h4 style={{ ...sectionTitle, marginTop: 0 }}>🏫 معلومات المدرسة</h4>
        <label style={labelStyle}>اسم المدرسة</label>
        <input
          className="input"
          placeholder="اسم المدرسة"
          value={settings.schoolName}
          onChange={e => setSettings({ ...settings, schoolName: e.target.value })}
        />
        <br /><br />
        <label style={labelStyle}>الرمز التعبيري (Emoji)</label>
        <input
          className="input"
          placeholder="الرمز التعبيري (Emoji)"
          value={settings.logoText}
          onChange={e => setSettings({ ...settings, logoText: e.target.value })}
        />

        {/* 🕐 Work Hours */}
        <h4 style={sectionTitle}>🕐 أوقات العمل</h4>
        <label style={labelStyle}>بداية العمل</label>
        <input
          className="input"
          type="time"
          value={settings.workStartTime}
          onChange={e => setSettings({ ...settings, workStartTime: e.target.value })}
        />
        <br /><br />
        <label style={labelStyle}>نهاية العمل</label>
        <input
          className="input"
          type="time"
          value={settings.workEndTime}
          onChange={e => setSettings({ ...settings, workEndTime: e.target.value })}
        />
        <br /><br />
        <label style={labelStyle}>مدة السماح للتأخير (دقائق)</label>
        <input
          className="input"
          type="number"
          value={settings.lateGraceMinutes}
          onChange={e => setSettings({ ...settings, lateGraceMinutes: Number(e.target.value) })}
        />

        {/* 📱 Features */}
        <h4 style={sectionTitle}>📱 الميزات</h4>
        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={settings.enableGeoFence}
            onChange={e => setSettings({ ...settings, enableGeoFence: e.target.checked })}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#00e5ff' }}
          />
          تفعيل التحقق الجغرافي (GPS)
        </label>
        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={settings.enableQRCode}
            onChange={e => setSettings({ ...settings, enableQRCode: e.target.checked })}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#00e5ff' }}
          />
          تفعيل رمز QR
        </label>
        <label style={checkLabel}>
          <input
            type="checkbox"
            checked={settings.enableFaceRecognition}
            onChange={e => setSettings({ ...settings, enableFaceRecognition: e.target.checked })}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#00e5ff' }}
          />
          تفعيل التعرف على الوجه
        </label>

        <br /><br />
        <button className="btn" style={{ width: '100%' }}>
          💾 حفظ الإعدادات
        </button>
      </form>
    </div>
  );
}