import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../api';
import { saveData, getData } from '../services/offlineStorage';
import { isOnline } from '../services/networkStatus';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // ✅ مفعّل افتراضياً
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  // ✅ تحميل البيانات المحفوظة عند فتح التطبيق
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const saved = await getData('saved_credentials');
        if (saved && saved.email) {
          setEmail(saved.email);
          setPassword(saved.password || '');
          setRememberMe(saved.rememberMe !== false);
        }
      } catch (err) {
        console.error('Error loading saved credentials:', err);
      }
    };
    loadSavedCredentials();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    setLoading(true);

    try {
      const online = await isOnline();

      if (online) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password,
          });

          // ✅ نحفظ بيانات الجلسة
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          // ✅ نحفظ نسخة في Preferences للاستخدام أوفلاين
          await saveData('cached_user', {
            user: data.user,
            token: data.token,
            email,
            timestamp: new Date().toISOString(),
          });

          // ✅ نحفظ بيانات تسجيل الدخول لو "تذكرني" مفعّل
          if (rememberMe) {
            await saveData('saved_credentials', {
              email,
              password,
              rememberMe: true,
              savedAt: new Date().toISOString(),
            });
          } else {
            // لو مش عايز يتذكر، نمسح البيانات المحفوظة
            await saveData('saved_credentials', null);
          }

          nav('/dashboard');
          return;
        } catch (apiErr) {
          if (apiErr.response) {
            setErr(apiErr.response?.data?.msg || '❌ البريد أو كلمة المرور غلط');
            setLoading(false);
            return;
          }
          // لو Network Error → نكمل للـ Offline
        }
      }

      // ✅ أوفلاين: نجرب البيانات المخزنة
      const cached = await getData('cached_user');

      if (cached && cached.user && cached.token) {
        if (cached.email && cached.email.toLowerCase() === email.toLowerCase()) {
          localStorage.setItem('token', cached.token);
          localStorage.setItem('user', JSON.stringify(cached.user));

          // ✅ نحفظ بيانات تسجيل الدخول لو "تذكرني" مفعّل
          if (rememberMe) {
            await saveData('saved_credentials', {
              email,
              password,
              rememberMe: true,
              savedAt: new Date().toISOString(),
            });
          }

          setMsg('📴 وضع أوفلاين — تم تسجيل الدخول من البيانات المخزنة');

          setTimeout(() => {
            nav('/dashboard');
          }, 800);
          return;
        } else {
          setErr('❌ لا يوجد اتصال — البيانات المخزنة لا تطابق هذا البريد');
          setLoading(false);
          return;
        }
      }

      setErr('❌ لا يوجد اتصال بالإنترنت — سجل دخول أونلاين مرة أولاً');
      setLoading(false);
    } catch (e) {
      setErr(e.message || 'خطأ في الاتصال');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1f44 0%, #142b5c 100%)',
      padding: 16,
    }}>
      <div className="glass" style={{
        padding: 40,
        maxWidth: 440,
        width: '100%',
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
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <br /><br />
          <input
            className="input"
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {/* ✅ مربع "تذكرني" */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginTop: 16,
            gap: 10,
            direction: 'rtl',
          }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{
                width: 18,
                height: 18,
                cursor: 'pointer',
                accentColor: '#0a1f44',
              }}
            />
            <label
              htmlFor="rememberMe"
              style={{
                fontSize: 14,
                color: 'var(--navy)',
                fontWeight: 600,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              💾 تذكرني (حفظ بيانات الدخول)
            </label>
          </div>

          {err && (
            <p style={{
              color: '#8e2b2b',
              marginTop: 12,
              fontSize: 13,
              padding: 10,
              background: '#f8d7da',
              borderRadius: 8,
            }}>{err}</p>
          )}

          {msg && (
            <p style={{
              color: '#8b6508',
              marginTop: 12,
              fontSize: 13,
              padding: 10,
              background: '#fff3cd',
              borderRadius: 8,
            }}>{msg}</p>
          )}

          <br />
          <button className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? '⏳ جاري...' : '🔓 تسجيل الدخول'}
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