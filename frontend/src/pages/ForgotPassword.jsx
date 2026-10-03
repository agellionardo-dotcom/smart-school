import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_URL } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    setMsg('');
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setMsg(data.msg);
      setEmail('');
    } catch (e) {
      setErr(e.response?.data?.msg || 'فشل الإرسال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1f44 0%, #142b5c 100%)'
    }}>
      <div className="glass" style={{ padding: 40, maxWidth: 440, width: '90%', textAlign: 'center' }}>
        <img src="/logo.png" alt="SMART" style={{ width: 130, marginBottom: 20, objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none'; }} />
        
        <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>🔐 استعادة كلمة المرور</h2>
        <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 30 }}>
          أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
        </p>

        {msg && (
          <div style={{ background: '#d4edda', color: '#155724', padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
            ✅ {msg}
          </div>
        )}
        {err && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
            ❌ {err}
          </div>
        )}

        <form onSubmit={submit}>
          <input
            className="input"
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <br /><br />
          <button className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? '⏳ جاري الإرسال...' : '📧 إرسال رابط إعادة التعيين'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 14 }}>
          <Link to="/" style={{ color: 'var(--navy)', fontWeight: 'bold', textDecoration: 'none' }}>
            ← العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}