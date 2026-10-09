import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMsg('✅ تم إرسال رابط إعادة التعيين على بريدك');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الإرسال'));
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
        <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>🔐 نسيت كلمة المرور</h1>
        <p style={{ color: 'var(--gray)', marginBottom: 30, fontSize: 14 }}>
          أدخل بريدك الإلكتروني وهنبعتلك رابط لإعادة التعيين
        </p>

        <form onSubmit={submit}>
          <input className="input" type="email" placeholder="البريد الإلكتروني"
            value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <br /><br />
          <button className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? '⏳ جاري...' : '📧 إرسال الرابط'}
          </button>
        </form>

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