// 📁 frontend/src/pages/VerifyEmail.jsx
// ⬅️ ملف جديد

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('رابط التفعيل غير صحيح');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await api.get(`/auth/verify-email/${token}`);
        if (data.success) {
          setStatus('success');
          setMessage(data.msg);
          setCompanyName(data.company?.name || '');
        } else {
          setStatus('error');
          setMessage(data.msg || 'فشل التفعيل');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.msg || 'الرابط غير صالح أو منتهي');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="verify-page">
      <div className="verify-card">
        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="verify-icon verify-icon-loading">⏳</div>
            <h1 className="verify-title">جاري التفعيل...</h1>
            <p className="verify-text">من فضلك انتظر لحظات</p>
            <div className="verify-spinner" />
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="verify-icon verify-icon-success">🎉</div>
            <h1 className="verify-title">تم التفعيل بنجاح!</h1>
            <p className="verify-text">
              {companyName && <>مرحباً بك في <b>{companyName}</b>!<br /></>}
              حسابك جاهز للاستخدام، يمكنك الآن تسجيل الدخول.
            </p>
            <div className="verify-actions">
              <button
                className="verify-btn verify-btn-primary"
                onClick={() => navigate('/login')}
              >
                🚀 تسجيل الدخول
              </button>
              <Link to="/" className="verify-btn verify-btn-ghost">
                🏠 العودة للرئيسية
              </Link>
            </div>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="verify-icon verify-icon-error">❌</div>
            <h1 className="verify-title">فشل التفعيل</h1>
            <p className="verify-text">{message}</p>
            <p className="verify-text-small">
              يمكنك طلب رابط تفعيل جديد من صفحة الدخول.
            </p>
            <div className="verify-actions">
              <Link to="/login" className="verify-btn verify-btn-primary">
                📧 طلب رابط جديد
              </Link>
              <Link to="/" className="verify-btn verify-btn-ghost">
                🏠 العودة للرئيسية
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}