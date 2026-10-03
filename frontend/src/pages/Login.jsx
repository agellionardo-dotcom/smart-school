import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../api';

export default function Login() {
  const [email, setEmail] = useState('admin@smart.com');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav('/dashboard');
    } catch (e) { setErr(e.response?.data?.msg || 'خطأ في الاتصال'); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1f44 0%, #142b5c 100%)'
    }}>
      <div className="glass" style={{
        padding: 40,
        maxWidth: 440,
        width: '90%',
        textAlign: 'center'
      }}>
        <img
          src="/logo.png"
          alt="SMART"
          style={{ width: 180, height: 180, objectFit: 'contain', marginBottom: 20 }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        
        <h1 style={{ color: 'var(--navy)', marginBottom: 4, fontSize: 28 }}>
          Smart School
        </h1>
        <p style={{ color: 'var(--gray)', marginBottom: 30, fontSize: 14 }}>
          نظام الحضور والانصراف الذكي
        </p>

        <form onSubmit={submit}>
          <input
            className="input"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <br /><br />
          <input
            className="input"
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {err && <p style={{ color: 'red', marginTop: 10, fontSize: 14 }}>{err}</p>}
          <br />
          <button className="btn" style={{ width: '100%' }}>
            تسجيل الدخول
          </button>
          
          <div style={{ marginTop: 16 }}>
            <Link to="/forgot-password" style={{ color: 'var(--navy)', fontSize: 14, fontWeight: 'bold', textDecoration: 'none' }}>
              🔐 نسيت كلمة المرور؟
            </Link>
          </div>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--gray)' }}>
          © 2026 SMART For Computer & Electronics
        </p>
      </div>
    </div>
  );
}