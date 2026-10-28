// 📁 frontend/src/pages/Profile.jsx
// ⬅️ ملف جديد

import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    phone: '',
    address: '',
    emergencyContact: { name: '', phone: '', relation: '' },
    profileImage: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    setForm({
      phone: storedUser.phone || '',
      address: storedUser.address || '',
      emergencyContact: storedUser.emergencyContact || { name: '', phone: '', relation: '' },
      profileImage: storedUser.profileImage || '',
    });
    setLoading(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      const { data } = await api.put('/auth/update-profile', form);
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setMsg('✅ تم تحديث الملف الشخصي');
      }
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'خطأ'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ textAlign: 'center', padding: 40 }}>⏳ جاري التحميل...</p>;
  }

  return (
    <div className="dashboard" style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: 'var(--ss-text-primary)' }}>
        👤 الملف الشخصي
      </h1>

      {msg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 12,
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'right',
          direction: 'rtl',
          background: msg.startsWith('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: msg.startsWith('✅') ? '#34d399' : '#fca5a5',
          border: `1px solid ${msg.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        }}>
          {msg}
        </div>
      )}

      <div className="ss-glass" style={{ padding: 24 }}>
        <form onSubmit={handleSubmit}>
          {/* ✅ معلومات ثابتة (مش بتتعدل) */}
          <div style={{ marginBottom: 20, padding: 16, background: 'var(--ss-bg-surface)', borderRadius: 12 }}>
            <p style={{ margin: '4px 0', fontSize: 13 }}><b>الاسم:</b> {user.name}</p>
            <p style={{ margin: '4px 0', fontSize: 13 }}><b>البريد:</b> {user.email}</p>
            <p style={{ margin: '4px 0', fontSize: 13 }}><b>الوظيفة:</b> {user.position || '—'}</p>
            <p style={{ margin: '4px 0', fontSize: 13 }}><b>الفرع:</b> {user.branch?.name || '—'}</p>
          </div>

          {/* ✅ حقول قابلة للتعديل */}
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ss-text-secondary)' }}>📱 رقم الهاتف</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="01xxxxxxxxx"
            style={{ marginBottom: 12 }}
          />

          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ss-text-secondary)' }}>🏠 العنوان</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="العنوان الحالي"
            style={{ marginBottom: 12 }}
          />

          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ss-text-secondary)' }}>📷 رابط الصورة الشخصية</label>
          <input
            className="input"
            value={form.profileImage}
            onChange={(e) => setForm({ ...form, profileImage: e.target.value })}
            placeholder="https://..."
            style={{ marginBottom: 12 }}
          />

          <h4 style={{ marginTop: 20, marginBottom: 12, fontSize: 15, color: 'var(--ss-text-primary)' }}>
            🆘 جهة اتصال للطوارئ
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              className="input"
              placeholder="الاسم"
              value={form.emergencyContact.name}
              onChange={(e) => setForm({
                ...form,
                emergencyContact: { ...form.emergencyContact, name: e.target.value },
              })}
            />
            <input
              className="input"
              placeholder="الهاتف"
              value={form.emergencyContact.phone}
              onChange={(e) => setForm({
                ...form,
                emergencyContact: { ...form.emergencyContact, phone: e.target.value },
              })}
            />
          </div>
          <input
            className="input"
            placeholder="صلة القرابة (أخ، أب، إلخ)"
            value={form.emergencyContact.relation}
            onChange={(e) => setForm({
              ...form,
              emergencyContact: { ...form.emergencyContact, relation: e.target.value },
            })}
            style={{ marginTop: 12, marginBottom: 20 }}
          />

          <button type="submit" className="btn" style={{ width: '100%', padding: 14 }} disabled={saving}>
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
          </button>
        </form>
      </div>
    </div>
  );
}