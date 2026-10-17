// 📁 frontend/src/pages/SignUp.jsx
// ⬅️ ملف جديد

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import './SignUp.css';

const PLAN_INFO = {
  free: { name: 'مجاني', price: '0 ج', maxEmployees: 10, features: ['حتى 10 موظفين', 'حضور + إجازات', 'تقارير أساسية'] },
  trial: { name: 'تجريبي (14 يوم)', price: '0 ج', maxEmployees: 25, features: ['حتى 25 موظف', 'كل الميزات', '14 يوم تجريبي'] },
  basic: { name: 'أساسي', price: '200 ج/شهر', maxEmployees: 25, features: ['حتى 25 موظف', 'حضور + إجازات', 'تقارير أساسية', 'دعم بالإيميل'] },
  pro: { name: 'احترافي', price: '500 ج/شهر', maxEmployees: 100, features: ['حتى 100 موظف', 'كل مميزات Basic', 'مرتبات + Face Recognition', 'تقارير متقدمة', 'دعم أولوية'] },
  enterprise: { name: 'مؤسسات', price: '1500 ج/شهر', maxEmployees: 999999, features: ['موظفين غير محدود', 'كل مميزات Pro', 'AI Assistant', 'API للتكامل', 'دعم مخصص 24/7'] },
};

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planParam = searchParams.get('plan') || 'trial';
  const planInfo = PLAN_INFO[planParam] || PLAN_INFO.trial;

  const [form, setForm] = useState({
    companyName: '',
    slug: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // ✅ Auto-generate slug from company name
  const autoSlug = (name) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);

  const handleNameChange = (value) => {
    setForm((f) => ({
      ...f,
      companyName: value,
      slug: !f.slug || f.slug === autoSlug(f.companyName) ? autoSlug(value) : f.slug,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.companyName.trim()) {
      return setError('❌ اسم الشركة مطلوب');
    }
    if (!form.email.trim()) {
      return setError('❌ البريد الإلكتروني مطلوب');
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return setError('❌ البريد الإلكتروني غير صحيح');
    }
    if (!form.phone.trim() || form.phone.length < 10) {
      return setError('❌ رقم الهاتف مطلوب (10 أرقام على الأقل)');
    }
    if (form.password.length < 6) {
      return setError('❌ كلمة المرور 6 أحرف على الأقل');
    }
    if (form.password !== form.confirmPassword) {
      return setError('❌ كلمة المرور وتأكيدها غير متطابقين');
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/signup', {
        companyName: form.companyName.trim(),
        slug: form.slug.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        plan: planParam,
      });

      if (data.success) {
        setSuccess(true);
        // حفظ بيانات للعرض
        localStorage.setItem('pending_signup', JSON.stringify({
          email: form.email,
          companyName: form.companyName,
          timestamp: new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.error('SignUp error:', err);
      setError('❌ ' + (err.response?.data?.msg || 'حدث خطأ، حاول مرة أخرى'));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Success Screen
  if (success) {
    return (
      <div className="signup-page">
        <div className="signup-card signup-success">
          <div className="signup-success-icon">✅</div>
          <h1>تم إنشاء الحساب بنجاح!</h1>
          <p className="signup-success-msg">
            تم إرسال بيانات الدخول على بريدك الإلكتروني:
          </p>
          <div className="signup-email-box">
            <span className="signup-email-label">📧</span>
            <span className="signup-email-value">{form.email}</span>
          </div>
          <p className="signup-hint">
            ⚠️ لم تجد الإيميل؟ تحقق من مجلد الـ Spam.
          </p>
          <p className="signup-hint">
            يمكنك الآن تسجيل الدخول بالبيانات التي وصلتك.
          </p>
          <div className="signup-actions">
            <button
              className="signup-btn signup-btn-primary"
              onClick={() => navigate('/login')}
            >
              🚀 تسجيل الدخول
            </button>
            <button
              className="signup-btn signup-btn-ghost"
              onClick={() => navigate('/')}
            >
              🏠 العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div className="signup-container">
        {/* Header */}
        <div className="signup-header">
          <Link to="/" className="signup-brand">
            <img src="/nabd-icon.png" alt="Nabd" className="signup-logo" />
            <span className="signup-brand-name">Nabd</span>
          </Link>
          <h1 className="signup-title">ابدأ رحلتك مع Nabd</h1>
          <p className="signup-subtitle">
            أنشئ حساب شركتك في دقيقة — بدون بطاقة دفع
          </p>
        </div>

        {/* Plan Badge */}
        <div className="signup-plan-badge">
          <span className="signup-plan-label">الخطة المختارة:</span>
          <span className="signup-plan-name">{planInfo.name}</span>
          <span className="signup-plan-price">{planInfo.price}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="signup-form">
          {error && <div className="signup-error">{error}</div>}

          <div className="signup-field">
            <label>🏢 اسم الشركة *</label>
            <input
              type="text"
              placeholder="مثال: شركة النور"
              value={form.companyName}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="signup-field">
            <label>🔖 الرابط المختصر (Slug)</label>
            <input
              type="text"
              placeholder="company-name"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              pattern="[a-z0-9-]+"
              title="حروف صغيرة، أرقام، وشرطات فقط"
              disabled={loading}
            />
            <span className="signup-hint-small">
              سيظهر في رابط شركتك: <b>nabd.app/{form.slug || 'company-name'}</b>
            </span>
          </div>

          <div className="signup-field">
            <label>📧 البريد الإلكتروني *</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              disabled={loading}
              autoComplete="email"
            />
            <span className="signup-hint-small">
              سيتم إرسال بيانات الدخول على هذا البريد
            </span>
          </div>

          <div className="signup-field">
            <label>📱 رقم الهاتف *</label>
            <input
              type="tel"
              placeholder="01012345678"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              disabled={loading}
              autoComplete="tel"
            />
          </div>

          <div className="signup-row">
            <div className="signup-field">
              <label>🔒 كلمة المرور *</label>
              <input
                type="password"
                placeholder="6 أحرف على الأقل"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <div className="signup-field">
              <label>🔒 تأكيد كلمة المرور *</label>
              <input
                type="password"
                placeholder="أعد كتابتها"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="signup-btn signup-btn-primary signup-btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="signup-spinner" />
                جاري إنشاء الحساب...
              </>
            ) : (
              <>🚀 إنشاء الحساب — {planInfo.name}</>
            )}
          </button>

          <p className="signup-terms">
            بإنشاء حساب، أنت توافق على <a href="#">الشروط والأحكام</a> و <a href="#">سياسة الخصوصية</a>.
          </p>
        </form>

        {/* Footer */}
        <p className="signup-footer">
          لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}