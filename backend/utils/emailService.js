const nodemailer = require('nodemailer');

// إعداد البريد
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// إرسال إيميل إعادة تعيين كلمة المرور
async function sendResetPasswordEmail({ to, name, resetUrl }) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Smart School <noreply@smartschool.com>',
    to,
    subject: '🔐 إعادة تعيين كلمة المرور - Smart School',
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Cairo', Arial, sans-serif; background: #eef1f7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(10,31,68,0.15); }
          .header { background: linear-gradient(135deg, #0a1f44, #142b5c); color: #fff; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 26px; }
          .header p { margin: 8px 0 0; color: #d1d7e0; font-size: 14px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #0a1f44; font-size: 20px; margin-top: 0; }
          .content p { color: #5a6478; line-height: 1.8; font-size: 15px; }
          .btn { display: inline-block; padding: 14px 40px; background: linear-gradient(145deg, #0a1f44, #142b5c); color: #fff !important; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; margin: 20px 0; box-shadow: 0 6px 16px rgba(10,31,68,0.35); }
          .btn:hover { opacity: 0.9; }
          .info { background: #eef4ff; border-right: 4px solid #0a1f44; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #2e4373; }
          .footer { background: #f5f7fa; padding: 20px; text-align: center; color: #8b95a7; font-size: 12px; }
          .footer b { color: #0a1f44; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Smart School</h1>
            <p>نظام الحضور والانصراف الذكي</p>
          </div>
          <div class="content">
            <h2>مرحباً ${name}،</h2>
            <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك على نظام <b>Smart School</b>.</p>
            <p>لإعادة تعيين كلمة المرور، اضغط على الزر أدناه:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn">🔐 إعادة تعيين كلمة المرور</a>
            </div>
            <div class="info">
              ⏰ <b>ملاحظة:</b> الرابط صالح لمدة <b>15 دقيقة فقط</b>.
            </div>
            <p style="font-size: 13px; color: #8b95a7;">
              إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا الإيميل — حسابك آمن.
            </p>
            <p style="font-size: 12px; color: #8b95a7;">
              أو انسخ الرابط التالي والصقه في المتصفح:<br>
              <code style="background: #f5f7fa; padding: 4px; border-radius: 4px; word-break: break-all;">${resetUrl}</code>
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} <b>SMART For Computer & Electronics</b>
            <br>هذا إيميل آلي — لا ترد عليه
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendResetPasswordEmail };