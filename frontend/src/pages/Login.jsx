import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { saveData, getData } from '../services/offlineStorage';
import { isOnline } from '../services/networkStatus';
import {
  checkBiometricAvailability,
  enableBiometric,
  loginWithBiometric,
  isBiometricEnabled,
  getDeviceId,
} from '../services/biometric';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [showEnablePrompt, setShowEnablePrompt] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const nav = useNavigate();

  // ============================================
  // ✅ 1. تحميل البيانات + فحص البصمة
  // ============================================
  useEffect(() => {
    const init = async () => {
      // تحميل الـ credentials المحفوظة
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

      // فحص البصمة
      try {
        const availability = await checkBiometricAvailability();
        setBiometricAvailable(availability.available);
        setBiometricType(availability.type);

        const enabled = await isBiometricEnabled();
        setBiometricEnabledState(enabled);
      } catch (err) {
        console.warn('Biometric check error:', err);
      }
    };

    init();
  }, []);

  // ============================================
  // ✅ 2. تسجيل الدخول بالبصمة
  // ============================================
  const handleBiometricLogin = async () => {
    if (biometricLoading) return;

    setBiometricLoading(true);
    setErr('');

    try {
      const result = await loginWithBiometric();

      if (result.success) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));

        setMsg('✅ تم تسجيل الدخول بالبصمة');
        setTimeout(() => nav('/dashboard'), 500);
      }
    } catch (err) {
      console.error('Biometric login error:', err);
      setErr('❌ ' + (err.message || 'فشل تسجيل الدخول بالبصمة'));

      // ✅ لو الـ token منتهي → نمسح التخزين
      if (err.message?.includes('منتهية') || err.message?.includes('غير صالح')) {
        await handleClearBiometric();
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  // ============================================
  // ✅ 3. تفعيل البصمة (بعد Login ناجح)
  // ============================================
  const handleEnableBiometric = async () => {
    try {
      setBiometricLoading(true);

      const result = await enableBiometric();

      if (result.success) {
        setBiometricEnabledState(true);
        setShowEnablePrompt(false);
        setMsg('✅ تم تفعيل البصمة بنجاح');
        setTimeout(() => nav('/dashboard'), 800);
      }
    } catch (err) {
      console.error('Enable biometric error:', err);
      setErr('❌ ' + (err.message || 'فشل تفعيل البصمة'));
      setShowEnablePrompt(false);
      setTimeout(() => nav('/dashboard'), 500);
    } finally {
      setBiometricLoading(false);
    }
  };

  // ============================================
  // ✅ 4. مسح بيانات البصمة
  // ============================================
  const handleClearBiometric = async () => {
    try {
      const { clearBiometricData } = await import('../services/biometric');
      await clearBiometricData();
      setBiometricEnabledState(false);
    } catch (err) {
      console.warn('Clear error:', err);
    }
  };

  // ============================================
  // ✅ 5. تسجيل الدخول العادي
  // ============================================
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    setLoading(true);

    try {
      const online = await isOnline();

      if (online) {
        try {
          const { data } = await api.post('/auth/login', { email, password });

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          await saveData('cached_user', {
            user: data.user,
            token: data.token,
            email,
            timestamp: new Date().toISOString(),
          });

          if (rememberMe) {
            await saveData('saved_credentials', {
              email,
              password,
              rememberMe: true,
              savedAt: new Date().toISOString(),
            });
          } else {
            await saveData('saved_credentials', null);
          }

          // ✅ لو البصمة متوفرة ومش مفعّلة → اسأل المستخدم
          if (biometricAvailable && !biometricEnabled) {
            setShowEnablePrompt(true);
            setLoading(false);
          } else {
            nav('/dashboard');
          }
          return;
        } catch (apiErr) {
          if (apiErr.response) {
            const status = apiErr.response.status;
            let errorMsg = apiErr.response?.data?.msg || apiErr.response?.data?.message;

            if (!errorMsg) {
              if (status === 401) errorMsg = '❌ البريد أو كلمة المرور غلط';
              else if (status === 404) errorMsg = '⚠️ خطأ في الاتصال بالسيرفر (404)';
              else if (status === 500) errorMsg = '🔥 خطأ في السيرفر، حاول لاحقاً';
              else errorMsg = '❌ فشل تسجيل الدخول';
            }

            setErr(errorMsg);
            setLoading(false);
            return;
          }
          console.warn('Network error, trying offline:', apiErr.message);
        }
      }

      // ✅ وضع أوفلاين
      const cached = await getData('cached_user');

      if (cached && cached.user && cached.token) {
        if (cached.email && cached.email.toLowerCase() === email.toLowerCase()) {
          localStorage.setItem('token', cached.token);
          localStorage.setItem('user', JSON.stringify(cached.user));

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

  // ============================================
  // ✅ Render
  // ============================================
  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo + Title */}
        <div className="login-header">
          <div className="login-logo-wrap">
            <div className="login-logo-glow" />
            <img
              src="/logo.png"
              alt="SMART"
              className="login-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <h1 className="login-title">Smart School</h1>
          <p className="login-subtitle">نظام الحضور والانصراف الذكي</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <span className="login-field-icon">📧</span>
            <input
              className="login-input"
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <span className="login-field-icon">🔒</span>
            <input
              className="login-input"
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="login-remember">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="login-checkbox"
            />
            <label htmlFor="rememberMe" className="login-checkbox-label">
              💾 تذكرني (حفظ بيانات الدخول)
            </label>
          </div>

          {err && <div className="login-alert login-alert-error">{err}</div>}
          {msg && <div className="login-alert login-alert-info">{msg}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="login-spinner" />
                جاري...
              </>
            ) : (
              <>🔓 تسجيل الدخول</>
            )}
          </button>

          {/* ✅ زر البصمة */}
          {biometricAvailable && biometricEnabled && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading || loading}
              className="login-btn login-btn-biometric"
            >
              {biometricLoading ? (
                <>
                  <span className="login-spinner" />
                  جاري...
                </>
              ) : (
                <>
                  {biometricType === 'faceId' ? '👤 الدخول بـ Face ID' : '🔐 الدخول بالبصمة'}
                </>
              )}
            </button>
          )}

          <div className="login-forgot">
            <Link to="/forgot-password" className="login-forgot-link">
              🔐 نسيت كلمة المرور؟
            </Link>
          </div>
        </form>

        <p className="login-footer">
          © 2026 SMART For Computer &amp; Electronics
        </p>
      </div>

      {/* ✅ Modal تفعيل البصمة */}
      {showEnablePrompt && (
        <div className="login-modal-overlay">
          <div className="login-modal">
            <div className="login-modal-icon">🔐</div>
            <h2 className="login-modal-title">تفعيل الدخول بالبصمة؟</h2>
            <p className="login-modal-text">
              سجّل دخولك في المرة الجاية ببصمة إصبعك
              {biometricType === 'faceId' && ' أو Face ID'}
              — أسرع وأأمن من كتابة كلمة المرور.
            </p>

            {err && <div className="login-alert login-alert-error">{err}</div>}

            <div className="login-modal-actions">
              <button
                type="button"
                onClick={handleEnableBiometric}
                disabled={biometricLoading}
                className="login-btn login-btn-success"
              >
                {biometricLoading ? (
                  <>
                    <span className="login-spinner" />
                    جاري...
                  </>
                ) : (
                  <>✅ نعم، فعّل</>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEnablePrompt(false);
                  nav('/dashboard');
                }}
                disabled={biometricLoading}
                className="login-btn login-btn-ghost"
              >
                لا، شكراً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Styles ============ */}
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          z-index: 2;
        }

        .login-card {
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

        @keyframes loginCardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-header { margin-bottom: 28px; }

        .login-logo-wrap {
          position: relative;
          display: inline-block;
          margin-bottom: 16px;
        }

        .login-logo-glow {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 229, 255, 0.3), transparent 70%);
          z-index: 0;
          animation: loginGlow 3s ease-in-out infinite;
        }

        @keyframes loginGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .login-logo {
          position: relative;
          z-index: 1;
          width: 130px;
          height: 130px;
          object-fit: contain;
          border-radius: 24px;
          filter: drop-shadow(0 8px 24px rgba(0, 229, 255, 0.3));
        }

        .login-title {
          margin: 0 0 6px;
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #00e5ff 0%, #a855f7 50%, #ec4899 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          margin: 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          font-weight: 500;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .login-field {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-field-icon {
          position: absolute;
          right: 16px;
          font-size: 18px;
          z-index: 2;
          pointer-events: none;
          opacity: 0.6;
        }

        .login-input {
          width: 100%;
          padding: 15px 48px 15px 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          color: #f8fafc;
          font-family: inherit;
          font-size: 15px;
          transition: all 0.25s;
          outline: none;
          direction: rtl;
          text-align: right;
        }

        .login-input::placeholder { color: rgba(255, 255, 255, 0.4); }

        .login-input:focus {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(0, 229, 255, 0.5);
          box-shadow: 0 0 0 4px rgba(0, 229, 255, 0.12);
        }

        .login-remember {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 4px;
          direction: rtl;
          text-align: right;
        }

        .login-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #00e5ff;
          flex-shrink: 0;
        }

        .login-checkbox-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
          cursor: pointer;
          user-select: none;
        }

        .login-alert {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          text-align: right;
          direction: rtl;
        }

        .login-alert-error {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .login-alert-info {
          background: rgba(251, 191, 36, 0.15);
          color: #fcd34d;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 15px 24px;
          margin-top: 6px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #00e5ff 0%, #a855f7 100%);
          color: #fff;
          font-family: inherit;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 8px 24px rgba(0, 229, 255, 0.3);
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 229, 255, 0.5);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* ✅ زر البصمة */
        .login-btn-biometric {
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          box-shadow: 0 8px 24px rgba(168, 85, 247, 0.3);
          margin-top: 4px;
        }

        .login-btn-biometric:hover:not(:disabled) {
          box-shadow: 0 12px 32px rgba(168, 85, 247, 0.5);
        }

        .login-btn-success {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        }

        .login-btn-ghost {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          box-shadow: none;
        }

        .login-btn-ghost:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          box-shadow: none;
        }

        .login-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: loginSpin 0.8s linear infinite;
        }

        @keyframes loginSpin {
          to { transform: rotate(360deg); }
        }

        .login-forgot {
          margin-top: 8px;
          text-align: center;
        }

        .login-forgot-link {
          color: #67e8f9;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .login-forgot-link:hover {
          color: #00e5ff;
          text-shadow: 0 0 12px rgba(0, 229, 255, 0.5);
        }

        .login-footer {
          margin: 24px 0 0;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
        }

        /* ✅ Modal */
        .login-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          animation: loginFadeIn 0.3s ease;
        }

        @keyframes loginFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .login-modal {
          max-width: 400px;
          width: 100%;
          padding: 32px 24px;
          background: rgba(15, 33, 56, 0.95);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          text-align: center;
          animation: loginModalIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes loginModalIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .login-modal-icon {
          font-size: 56px;
          margin-bottom: 16px;
        }

        .login-modal-title {
          margin: 0 0 12px;
          font-size: 22px;
          font-weight: 800;
          color: #f8fafc;
        }

        .login-modal-text {
          margin: 0 0 24px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.7;
        }

        .login-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
            border-radius: 24px;
          }
          .login-logo { width: 100px; height: 100px; }
          .login-title { font-size: 26px; }
        }
      `}</style>
    </div>
  );
}