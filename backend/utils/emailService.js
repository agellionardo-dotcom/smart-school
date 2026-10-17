// 📁 backend/utils/emailService.js
// ⬅️ استبدل الملف بالكامل

const nodemailer = require('nodemailer');

// ============================================
// ✅ Transporter (Yahoo SMTP)
// ============================================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mail.yahoo.com',
  port: parseInt(process.env.EMAIL_PORT || '465', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================
// ✅ Helper: إرسال إيميل HTML
// ============================================
async function sendEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const mailOptions = { from, to, subject, html };
  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Email sent:', info.messageId);
  return info;
}

// ============================================
// ✅ 1. إيميل الترحيب (SignUp)
// ============================================
async function sendWelcomeEmail({ to, name, companyName, username, password, plan, trialEndsAt }) {
  const planLabels = {
    free: 'مجاني',
    trial: 'تجريبي',
    basic: 'أساسي',
    pro: 'احترافي',
    enterprise: 'مؤسسات',
    internal: 'داخلي',
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl; text-align: right;">
      <div style="background: linear-gradient(135deg, #00e5ff, #a855f7); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 32px;">Nabd</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">نبض شركتك</p>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1e293b; margin-top: 0;">مرحباً ${name} 👋</h2>
        <p style="color: #475569; line-height: 1.8;">
          تم إنشاء حساب شركة <b>${companyName}</b> على منصة Nabd بنجاح!
        </p>

        <div style="background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1e293b; margin-top: 0;">📋 بيانات الدخول</h3>
          <p style="margin: 8px 0; color: #475569;">
            <b>البريد الإلكتروني (Username):</b><br>
            <span style="color: #00e5ff; font-family: monospace; font-size: 15px;">${username}</span>
          </p>
          <p style="margin: 8px 0; color: #475569;">
            <b>كلمة المرور:</b><br>
            <span style="color: #00e5ff; font-family: monospace; font-size: 15px;">${password}</span>
          </p>
          <p style="margin: 8px 0; color: #475569;">
            <b>الخطة:</b> ${planLabels[plan] || plan}
          </p>
          <p style="margin: 8px 0; color: #475569;">
            <b>الفترة التجريبية:</b> تنتهي في ${new Date(trialEndsAt).toLocaleDateString('ar-EG')}
          </p>
        </div>

        <p style="color: #475569; line-height: 1.8;">
          يمكنك الدخول الآن من هنا:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login"
             style="background: linear-gradient(135deg, #00e5ff, #a855f7); color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🚀 تسجيل الدخول
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px; margin-top: 30px; text-align: center;">
          إذا واجهت أي مشكلة، تواصل معنا على هذا البريد.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `مرحباً بك في Nabd — ${companyName}`,
    html,
  });
}

// ============================================
// ✅ 2. إيميل استعادة كلمة المرور
// ============================================
async function sendResetPasswordEmail({ to, name, resetUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl; text-align: right;">
      <div style="background: linear-gradient(135deg, #00e5ff, #a855f7); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 32px;">Nabd</h1>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1e293b; margin-top: 0;">مرحباً ${name} 👋</h2>
        <p style="color: #475569; line-height: 1.8;">
          طلبت إعادة تعيين كلمة المرور. اضغط على الزر أدناه للمتابعة:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: linear-gradient(135deg, #00e5ff, #a855f7); color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🔑 إعادة تعيين كلمة المرور
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          ⏰ هذا الرابط صالح لمدة 15 دقيقة فقط.
        </p>
        <p style="color: #94a3b8; font-size: 13px;">
          إذا لم تطلب هذا، تجاهل الإيميل.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Nabd — إعادة تعيين كلمة المرور',
    html,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendResetPasswordEmail,
};