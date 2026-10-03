import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';

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
    defaultRadius: 5
  });
  const [msg, setMsg] = useState('');
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    axios.get(`${API_URL}/api/admin/settings`, { headers })
      .then(r => setSettings({ ...settings, ...r.data }))
      .catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/admin/settings`, settings, { headers });
      setMsg('✅ تم حفظ الإعدادات');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل'));
    }
  };

  return (
    <div>
      <h3 style={{ color: 'var(--navy)', marginBottom: 20 }}>⚙️ إعدادات التطبيق</h3>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000'
        }}>{msg}</p>
      )}

      <form onSubmit={save} className="glass" style={{ padding: 24 }}>
        <h4 style={{ color: 'var(--navy)', marginBottom: 12 }}>🏫 معلومات المدرسة</h4>
        <input className="input" placeholder="اسم المدرسة" value={settings.schoolName}
          onChange={e => setSettings({ ...settings, schoolName: e.target.value })} />
        <br /><br />
        <input className="input" placeholder="الرمز التعبيري (Emoji)" value={settings.logoText}
          onChange={e => setSettings({ ...settings, logoText: e.target.value })} />

        <h4 style={{ color: 'var(--navy)', marginTop: 24, marginBottom: 12 }}>🕐 أوقات العمل</h4>
        <label>بداية العمل</label>
        <input className="input" type="time" value={settings.workStartTime}
          onChange={e => setSettings({ ...settings, workStartTime: e.target.value })} />
        <br /><br />
        <label>نهاية العمل</label>
        <input className="input" type="time" value={settings.workEndTime}
          onChange={e => setSettings({ ...settings, workEndTime: e.target.value })} />
        <br /><br />
        <label>مدة السماح للتأخير (دقائق)</label>
        <input className="input" type="number" value={settings.lateGraceMinutes}
          onChange={e => setSettings({ ...settings, lateGraceMinutes: Number(e.target.value) })} />

        <h4 style={{ color: 'var(--navy)', marginTop: 24, marginBottom: 12 }}>📱 الميزات</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <input type="checkbox" checked={settings.enableGeoFence}
            onChange={e => setSettings({ ...settings, enableGeoFence: e.target.checked })} />
          تفعيل التحقق الجغرافي (GPS)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <input type="checkbox" checked={settings.enableQRCode}
            onChange={e => setSettings({ ...settings, enableQRCode: e.target.checked })} />
          تفعيل رمز QR
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={settings.enableFaceRecognition}
            onChange={e => setSettings({ ...settings, enableFaceRecognition: e.target.checked })} />
          تفعيل التعرف على الوجه
        </label>

        <br /><br />
        <button className="btn" style={{ width: '100%' }}>💾 حفظ الإعدادات</button>
      </form>
    </div>
  );
}