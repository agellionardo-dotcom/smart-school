import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../api';

export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [user, setUser] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/api/auth/verify-reset-token/${token}`)
      .then(r => {
        if (r.data.valid) setUser(r.data);
        else setErr(r.data.msg);
      })
      .catch(e => setErr(e.response?.data?.msg || 'رابط غير صالح'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setErr('كلمتا المرور غير متطابقتين');
      return;
    }
    if (password.length < 6) {
      setErr('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setVerifying(true);
    setErr('');
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/reset-password/${token}`, { password });
      setMsg(data.msg);
      setTimeout(() => nav('/'), 2500);
    } catch (e) {
      setErr(e.response?.data?.msg || 'فشل تغيير كلمة المرور');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a1f44 0%, #142b5c 100%)' }}>
        <p style={{ color: '#fff', fontSize: 18 }}>⏳ جاري التحقق من الرابط...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a1f44 0%, #142b5c 100%)' }}>
      <div className="glass" style={{ padding: 40, maxWidth: 440, width: '90%', textAlign: 'center' }}>
        <img src="/logo.png" alt="SMART" style={{ width: 130, marginBottom: 20, objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none'; }} />

        <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>🔐 كلمة مرور جديدة</h2>
        
        {err && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
            ❌ {err}
            <br />
            <Link to="/forgot-password" style={{ color: '#721c24', fontWeight: 'bold', fontSize: 13 }}>
              طلب رابط جديد
            </Link>
          </div>
        )}

        {msg && (
          <div style={{ background: '#d4edda', color: '#155724', padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
            ✅ {msg}
            <br />
            <small>جاري التحويل لتسجيل الدخول...</small>
          </div>
        )}

        {user && !msg && (
          <>
            <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 20 }}>
              مرحباً <b>{user.name}</b>
              <br />
              <small>{user.email}</small>
            </p>
            <form onSubmit={submit}>
              <input
                className="input"
                type="password"
                placeholder="كلمة المرور الجديدة"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <br /><br />
              <input
                className="input"
                type="password"
                placeholder="تأكيد كلمة المرور"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
              <br /><br />
              <button className="btn" style={{ width: '100%' }} disabled={verifying}>
                {verifying ? '⏳ جاري الحفظ...' : '💾 حفظ كلمة المرور'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}