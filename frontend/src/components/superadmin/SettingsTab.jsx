import React, { useState } from 'react';
import api from '../../api';

export default function SettingsTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    if (newPassword.length < 8) {
      return setMsg('❌ كلمة المرور الجديدة 8 أحرف على الأقل');
    }

    if (newPassword !== confirmPassword) {
      return setMsg('❌ كلمة المرور وتأكيدها غير متطابقين');
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (data.success) {
        setMsg('✅ تم تغيير كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'خطأ'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="superadmin-section-title">⚙️ إعدادات الحساب</h3>

      <div
        className="ss-glass"
        style={{ padding: 24, maxWidth: 500, margin: '0 auto' }}
      >
        <h4 style={{ marginTop: 0, color: 'var(--ss-text-primary)' }}>
          🔐 تغيير كلمة المرور
        </h4>

        {msg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
              textAlign: 'right',
              direction: 'rtl',
              background: msg.startsWith('✅')
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              color: msg.startsWith('✅') ? '#34d399' : '#fca5a5',
              border: `1px solid ${
                msg.startsWith('✅')
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
              }`,
            }}
          >
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="password"
            placeholder="كلمة المرور الحالية *"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={{ marginBottom: 12 }}
          />

          <input
            className="input"
            type="password"
            placeholder="كلمة المرور الجديدة * (8 أحرف على الأقل)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={{ marginBottom: 12 }}
          />

          <input
            className="input"
            type="password"
            placeholder="تأكيد كلمة المرور الجديدة *"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{ marginBottom: 12 }}
          />

          <button
            type="submit"
            className="btn"
            style={{ width: '100%', padding: 14, fontSize: 15 }}
            disabled={loading}
          >
            {loading ? '⏳ جاري التغيير...' : '💾 حفظ كلمة المرور الجديدة'}
          </button>
        </form>
      </div>
    </div>
  );
}