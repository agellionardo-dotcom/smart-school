import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [valid, setValid] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/auth/verify-reset-token/${token}`)
      .then(() => setValid(true))
      .catch(() => setValid(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMsg('❌ كلمتا المرور غير متطابقتين');
      return;
    }
    if (password.length < 6) {
      setMsg('❌ كلمة المرور قصيرة (6 أحرف على الأقل)');
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setMsg('✅ تم تغيير كلمة المرور بنجاح');
      setTimeout(() => nav('/'), 2000);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التغيير'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg, #0a1f44 0%, #142b5c 100%)',
      padding: 16,
    }}>
      <div className="glass" style={{ padding: 40, maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>🔐 إعادة تعيين كلمة المرور</h1>

        {valid === false && (
          <p style={{ padding: 12, background: '#f8d7da', borderRadius: 8, color: '#000', marginTop: 16 }}>
            ❌ الرابط غير صالح أو منتهي الصلاحية
          </p>
        )}

        {valid === true && (
          <>
            <p style={{ color: 'var(--gray)', marginBottom: 30, fontSize: 14 }}>
              أدخل كلمة المرور الجديدة
            </p>
            <form onSubmit={submit}>
              <input className="input" type="password" placeholder="كلمة المرور الجديدة"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              <br /><br />
              <input className="input" type="password" placeholder="تأكيد كلمة المرور"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
              <br /><br />
              <button className="btn" style={{ width: '100%' }} disabled={loading}>
                {loading ? '⏳ جاري...' : '💾 حفظ كلمة المرور'}
              </button>
            </form>
          </>
        )}

        {msg && (
          <p style={{
            marginTop: 16, padding: 12,
            background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da',
            borderRadius: 8, fontSize: 13, color: '#000'
          }}>{msg}</p>
        )}

        <div style={{ marginTop: 20 }}>
          <Link to="/" style={{ color: 'var(--navy)', fontSize: 14, fontWeight: 'bold', textDecoration: 'none' }}>
            ← الرجوع لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}