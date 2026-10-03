const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendResetPasswordEmail } = require('../utils/emailService');

// ==================== تسجيل الدخول ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).populate('branch');
    if (!user) return res.status(400).json({ msg: 'بيانات خاطئة' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: 'بيانات خاطئة' });

    if (!user.active) {
      return res.status(403).json({ msg: 'الحساب معطّل — راجع المدير' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, branch: user.branch?._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تسجيل مستخدم جديد ====================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, branch, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      branch,
      role: role || 'employee'
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== طلب إعادة تعيين كلمة المرور ====================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'البريد مطلوب' });

    const user = await User.findOne({ email: email.toLowerCase() });

    const genericMsg = 'إذا كان البريد مسجّلاً، ستصلك رسالة لإعادة التعيين';

    if (!user) {
      return res.json({ msg: genericMsg });
    }

    if (!user.active) {
      return res.status(403).json({ msg: 'الحساب معطّل — راجع المدير' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    try {
      await sendResetPasswordEmail({
        to: user.email,
        name: user.name,
        resetUrl
      });
      res.json({ msg: genericMsg, sent: true });
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      res.status(500).json({ msg: 'فشل إرسال الإيميل — تحقق من إعدادات البريد' });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== التحقق من صلاحية الـ token ====================
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ valid: false, msg: 'الرابط غير صالح أو منتهي' });
    }

    res.json({ valid: true, email: user.email, name: user.name });
  } catch (err) {
    res.status(500).json({ valid: false, msg: err.message });
  }
});

// ==================== إعادة تعيين كلمة المرور ====================
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ msg: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'الرابط غير صالح أو منتهي' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: '✅ تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;