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
    <div className="forgot-page">
      <div className="forgot-card">
        <h1 className="forgot-title">🔐 نسيت كلمة المرور</h1>
        <p className="forgot-subtitle">
          أدخل بريدك الإلكتروني وهنبعتلك رابط لإعادة التعيين
        </p>

        <form onSubmit={submit}>
          <div className="forgot-field">
            <span className="forgot-icon">📧</span>
            <input
              className="login-input"
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {msg && (
            <div
              className={`forgot-alert ${
                msg.startsWith('✅') ? 'forgot-alert-success' : 'forgot-alert-error'
              }`}
            >
              {msg}
            </div>
          )}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="login-spinner" />
                جاري...
              </>
            ) : (
              <>📧 إرسال الرابط</>
            )}
          </button>
        </form>

        <div className="forgot-footer">
          <Link to="/" className="forgot-link">
            ← الرجوع لتسجيل الدخول
          </Link>
        </div>
      </div>

      <style>{`
        .forgot-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          z-index: 2;
        }

        .forgot-card {
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

        .forgot-title {
          margin: 0 0 8px;
          font-size: 26px;
          font-weight: 800;
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .forgot-subtitle {
          margin: 0 0 24px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          font-weight: 500;
          line-height: 1.6;
        }

        .forgot-field {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 14px;
        }

        .forgot-icon {
          position: absolute;
          right: 16px;
          font-size: 18px;
          z-index: 2;
          pointer-events: none;
          opacity: 0.6;
        }

        .forgot-alert {
          padding: 12px 16px;
          border-radius: 12px;
          margin: 14px 0;
          font-size: 13px;
          font-weight: 500;
          text-align: right;
          direction: rtl;
          animation: loginAlertIn 0.3s ease;
        }

        .forgot-alert-success {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .forgot-alert-error {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .forgot-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .forgot-link {
          color: #67e8f9;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .forgot-link:hover {
          color: #00e5ff;
          text-shadow: 0 0 12px rgba(0, 229, 255, 0.5);
        }
      `}</style>
    </div>
  );
}