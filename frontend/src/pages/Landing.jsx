import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './Landing.css';

// ============================================
// Nabd — Landing Page
// ============================================

const FEATURES = [
  {
    icon: '📍',
    title: 'الحضور والانصراف',
    desc: 'تسجيل بـ GPS + QR Code + بصمة + Face Recognition',
  },
  {
    icon: '📝',
    title: 'الإجازات',
    desc: 'طلب وموافقة إلكترونية مع تتبع الرصيد',
  },
  {
    icon: '💰',
    title: 'المرتبات',
    desc: 'حساب تلقائي مع الخصومات والمكافآت',
  },
  {
    icon: '📊',
    title: 'التقارير',
    desc: 'تقارير Excel و PDF مع رسوم بيانية',
  },
  {
    icon: '🤖',
    title: 'مساعد ذكي',
    desc: 'AI Assistant يجاوب على استفساراتك',
  },
  {
    icon: '🔔',
    title: 'الإشعارات',
    desc: 'Push Notifications فورية لكل الأحداث',
  },
];

const PRICING = [
  {
    name: 'Basic',
    price: '200',
    period: 'ج/شهر',
    features: [
      'حتى 25 موظف',
      'حضور + إجازات',
      'تقارير أساسية',
      'دعم بالإيميل',
    ],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '500',
    period: 'ج/شهر',
    features: [
      'حتى 100 موظف',
      'كل مميزات Basic',
      'مرتبات + Face Recognition',
      'تقارير متقدمة',
      'دعم أولوية',
    ],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '1500',
    period: 'ج/شهر',
    features: [
      'موظفين غير محدود',
      'كل مميزات Pro',
      'AI Assistant',
      'API للتكامل',
      'دعم مخصص 24/7',
    ],
    highlight: false,
  },
];

export default function Landing() {
  const nav = useNavigate();
  const { actualTheme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ Navbar shadow عند الـ scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="lp">
      {/* ============================================ */}
      {/* Navbar */}
      {/* ============================================ */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link to="/" className="lp-brand">
            <img src="/nabd-icon.png" alt="Nabd" className="lp-brand-logo" />
            <span className="lp-brand-name">Nabd</span>
          </Link>

          {/* Desktop Menu */}
          <div className="lp-nav-links">
            <button onClick={() => scrollTo('features')}>المميزات</button>
            <button onClick={() => scrollTo('pricing')}>الأسعار</button>
            <button onClick={() => scrollTo('download')}>حمّل التطبيق</button>
          </div>

          <div className="lp-nav-actions">
            <button
              className="lp-theme-btn"
              onClick={toggleTheme}
              aria-label="تبديل الوضع"
              title="تبديل الوضع"
            >
              {actualTheme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link to="/login" className="lp-btn lp-btn-outline">
              دخول
            </Link>
            <Link to="/login" className="lp-btn lp-btn-primary">
              ابدأ مجانًا
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lp-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="القائمة"
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lp-mobile-menu">
            <button onClick={() => scrollTo('features')}>المميزات</button>
            <button onClick={() => scrollTo('pricing')}>الأسعار</button>
            <button onClick={() => scrollTo('download')}>حمّل التطبيق</button>
            <Link to="/login" className="lp-mobile-cta">
              ابدأ مجانًا
            </Link>
          </div>
        )}
      </nav>

      {/* ============================================ */}
      {/* Hero */}
      {/* ============================================ */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            ✨ نظام HR متكامل — مدعوم بالذكاء الاصطناعي
          </div>

          <h1 className="lp-hero-title">
            نبض <span className="lp-gradient">شركتك</span>
          </h1>

          <p className="lp-hero-subtitle">
            نظام متكامل لإدارة الحضور، الإجازات، المرتبات، والتقارير —
            لكل الفروع، مع دعم كامل للعربية.
          </p>

          <div className="lp-hero-cta">
            <button
              onClick={() => nav('/login')}
              className="lp-btn lp-btn-primary lp-btn-lg"
            >
              🚀 ابدأ مجانًا 14 يوم
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="lp-btn lp-btn-ghost lp-btn-lg"
            >
              اعرف المزيد
            </button>
          </div>

          <div className="lp-hero-stats">
            <div className="lp-stat">
              <div className="lp-stat-value">+6</div>
              <div className="lp-stat-label">فروع مدعومة</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-value">99.9%</div>
              <div className="lp-stat-label">وقت التشغيل</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-value">24/7</div>
              <div className="lp-stat-label">دعم فني</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Features */}
      {/* ============================================ */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">المميزات</span>
            <h2 className="lp-section-title">كل اللي شركتك محتاجاه</h2>
            <p className="lp-section-subtitle">
              أدوات متكاملة لإدارة فريقك بكفاءة
            </p>
          </div>

          <div className="lp-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Pricing */}
      {/* ============================================ */}
      <section id="pricing" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">الأسعار</span>
            <h2 className="lp-section-title">خطط تناسب كل شركة</h2>
            <p className="lp-section-subtitle">
              ابدأ مجانًا 14 يوم — من غير بطاقة دفع
            </p>
          </div>

          <div className="lp-pricing">
            {PRICING.map((p, i) => (
              <div
                key={i}
                className={`lp-price-card ${p.highlight ? 'lp-price-card-hl' : ''}`}
              >
                {p.highlight && (
                  <div className="lp-price-badge">⭐ الأكثر شعبية</div>
                )}
                <h3 className="lp-price-name">{p.name}</h3>
                <div className="lp-price-amount">
                  <span className="lp-price-num">{p.price}</span>
                  <span className="lp-price-period">{p.period}</span>
                </div>
                <ul className="lp-price-features">
                  {p.features.map((feat, j) => (
                    <li key={j}>
                      <span className="lp-check">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => nav('/login')}
                  className={`lp-btn lp-btn-block ${
                    p.highlight ? 'lp-btn-primary' : 'lp-btn-outline'
                  }`}
                >
                  ابدأ الآن
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Download */}
      {/* ============================================ */}
      <section id="download" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag">حمّل التطبيق</span>
            <h2 className="lp-section-title">استخدم Nabd من أي مكان</h2>
            <p className="lp-section-subtitle">
              متاح على الموبايل والويب
            </p>
          </div>

          <div className="lp-download">
            <a
              href="https://github.com/agellionardo-dotcom/smart-school/releases/download/v1.6/SmartSchool-v1.6.apk"
              className="lp-download-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="lp-download-icon">📱</div>
              <div>
                <div className="lp-download-title">Android APK</div>
                <div className="lp-download-desc">حمّل مباشرة — 28.6 MB</div>
              </div>
            </a>

            <a
              href="https://smart-school-delta-amber.vercel.app"
              className="lp-download-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="lp-download-icon">🌐</div>
              <div>
                <div className="lp-download-title">تطبيق الويب (PWA)</div>
                <div className="lp-download-desc">
                  يشتغل من المتصفح — بدون تثبيت
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA Final */}
      {/* ============================================ */}
      <section className="lp-cta-final">
        <div className="lp-container">
          <h2 className="lp-cta-title">جاهز تبدأ؟</h2>
          <p className="lp-cta-subtitle">
            جرّب Nabd مجانًا لمدة 14 يوم — من غير بطاقة دفع
          </p>
          <button
            onClick={() => nav('/login')}
            className="lp-btn lp-btn-primary lp-btn-lg"
          >
            🚀 ابدأ مجانًا الآن
          </button>
        </div>
      </section>

      {/* ============================================ */}
      {/* Footer */}
      {/* ============================================ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <img src="/nabd-icon.png" alt="Nabd" className="lp-footer-logo" />
              <div>
                <div className="lp-footer-name">Nabd</div>
                <div className="lp-footer-tagline">نبض شركتك</div>
              </div>
            </div>

            <div className="lp-footer-links">
              <Link to="/login">دخول</Link>
              <a href="#features">المميزات</a>
              <a href="#pricing">الأسعار</a>
            </div>

            <div className="lp-footer-copy">
              © {new Date().getFullYear()} Nabd — نبض شركتك
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}