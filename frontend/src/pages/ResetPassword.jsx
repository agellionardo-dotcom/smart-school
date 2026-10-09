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
    <div className="reset-page">
      <div className="reset-card">
        <h1 className="reset-title">🔐 إعادة تعيين كلمة المرور</h1>

        {valid === false && (
          <div className="reset-alert reset-alert-error">
            ❌ الرابط غير صالح أو منتهي الصلاحية
          </div>
        )}

        {valid === true && (
          <>
            <p className="reset-subtitle">أدخل كلمة المرور الجديدة</p>

            <form onSubmit={submit}>
              <div className="reset-field">
                <span className="reset-icon">🔒</span>
                <input
                  className="login-input"
                  type="password"
                  placeholder="كلمة المرور الجديدة"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="reset-field">
                <span className="reset-icon">🔒</span>
                <input
                  className="login-input"
                  type="password"
                  placeholder="تأكيد كلمة المرور"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    جاري...
                  </>
                ) : (
                  <>💾 حفظ كلمة المرور</>
                )}
              </button>
            </form>
          </>
        )}

        {msg && (
          <div
            className={`reset-alert ${
              msg.startsWith('✅') ? 'reset-alert-success' : 'reset-alert-error'
            }`}
          >
            {msg}
          </div>
        )}

        <div className="reset-footer">
          <Link to="/" className="reset-link">
            ← الرجوع لتسجيل الدخول
          </Link>
        </div>
      </div>

      <style>{`
        .reset-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          z-index: 2;
        }

        .reset-card {
          width: 100%;
          max-width: 440px;
          padding: 40px 32px;
          background: rgba(15, 33, 56, 0.75);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 28px;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          text-align: center;
          animation: loginCardIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .reset-title {
          margin: 0 0 8px;
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .reset-subtitle {
          margin: 0 0 24px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          font-weight: 500;
        }

        .reset-field {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 14px;
        }

        .reset-icon {
          position: absolute;
          right: 16px;
          font-size: 18px;
          z-index: 2;
          pointer-events: none;
          opacity: 0.6;
        }

        .reset-alert {
          padding: 12px 16px;
          border-radius: 12px;
          margin: 14px 0;
          font-size: 13px;
          font-weight: 500;
          text-align: right;
          direction: rtl;
          animation: loginAlertIn 0.3s ease;
        }

        .reset-alert-success {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .reset-alert-error {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .reset-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .reset-link {
          color: #67e8f9;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .reset-link:hover {
          color: #00e5ff;
          text-shadow: 0 0 12px rgba(0, 229, 255, 0.5);
        }
      `}</style>
    </div>
  );
}