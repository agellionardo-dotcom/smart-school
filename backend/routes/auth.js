const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
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

// ============================================
// ✅ Biometric Login
// ============================================

// ==================== 1. تفعيل البصمة (بعد login عادي) ====================
router.post('/biometric/enable', auth, async (req, res) => {
  try {
    const { deviceId, deviceName, deviceModel, platform, biometricType } = req.body;

    if (!deviceId) {
      return res.status(400).json({ msg: 'deviceId مطلوب' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    // ✅ تحقق إن الجهاز مش مضاف قبل كده
    const existingDevice = user.trustedDevices.find((d) => d.deviceId === deviceId);

    // ✅ أنشئ refresh token طويل الأمد (60 يوم)
    const refreshToken = jwt.sign(
      { id: user._id, deviceId, type: 'biometric_refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '60d' }
    );

    const hashedToken = await bcrypt.hash(refreshToken, 10);

    if (existingDevice) {
      // ✅ تحديث الجهاز الموجود
      existingDevice.biometricEnabled = true;
      existingDevice.biometricType = biometricType || 'fingerprint';
      existingDevice.refreshToken = hashedToken;
      existingDevice.lastLogin = new Date();
      existingDevice.deviceName = deviceName || existingDevice.deviceName;
      existingDevice.deviceModel = deviceModel || existingDevice.deviceModel;
      existingDevice.platform = platform || existingDevice.platform;
    } else {
      // ✅ إضافة جهاز جديد
      user.trustedDevices.push({
        deviceId,
        deviceName,
        deviceModel,
        platform: platform || 'android',
        biometricEnabled: true,
        biometricType: biometricType || 'fingerprint',
        refreshToken: hashedToken,
      });
    }

    user.preferences = user.preferences || {};
    user.preferences.biometricLogin = true;

    await user.save();

    res.json({
      success: true,
      message: '✅ تم تفعيل البصمة بنجاح',
      refreshToken,
      biometricType: biometricType || 'fingerprint',
    });
  } catch (err) {
    console.error('Biometric enable error:', err);
    res.status(500).json({ msg: 'خطأ في تفعيل البصمة' });
  }
});

// ==================== 2. تسجيل الدخول بالبصمة ====================
router.post('/biometric/login', async (req, res) => {
  try {
    const { deviceId, refreshToken } = req.body;

    if (!deviceId || !refreshToken) {
      return res.status(400).json({ msg: 'بيانات ناقصة' });
    }

    // ✅ فك الـ token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ msg: 'الجلسة منتهية — سجّل دخول من جديد' });
    }

    if (decoded.type !== 'biometric_refresh' || decoded.deviceId !== deviceId) {
      return res.status(401).json({ msg: 'token غير صالح' });
    }

    const user = await User.findById(decoded.id)
      .select('+trustedDevices.refreshToken')
      .populate('branch');

    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    if (!user.active) {
      return res.status(403).json({ msg: 'الحساب معطّل — راجع المدير' });
    }

    // ✅ تحقق إن الجهاز موثوق
    const device = user.trustedDevices.find((d) => d.deviceId === deviceId);
    if (!device || !device.biometricEnabled) {
      return res.status(401).json({ msg: 'الجهاز غير موثوق' });
    }

    // ✅ تحقق من الـ token
    const isValid = await bcrypt.compare(refreshToken, device.refreshToken);
    if (!isValid) {
      return res.status(401).json({ msg: 'token غير صالح' });
    }

    // ✅ تحديث lastLogin
    device.lastLogin = new Date();
    user.lastLogin = new Date();
    await user.save();

    // ✅ إنشاء access token جديد (30 يوم)
    const accessToken = jwt.sign(
      { id: user._id, role: user.role, branch: user.branch?._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token: accessToken,
      user,
    });
  } catch (err) {
    console.error('Biometric login error:', err);
    res.status(500).json({ msg: 'خطأ في تسجيل الدخول' });
  }
});

// ==================== 3. إلغاء تفعيل البصمة لجهاز ====================
router.post('/biometric/disable', auth, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    user.trustedDevices = user.trustedDevices.filter(
      (d) => d.deviceId !== deviceId
    );

    // ✅ لو مفيش أجهزة موثوقة → عطّل الخيار
    if (user.trustedDevices.length === 0) {
      user.preferences = user.preferences || {};
      user.preferences.biometricLogin = false;
    }

    await user.save();
    res.json({ success: true, message: '✅ تم إلغاء تفعيل البصمة' });
  } catch (err) {
    res.status(500).json({ msg: 'خطأ' });
  }
});

// ==================== 4. جلب الأجهزة الموثوقة ====================
router.get('/biometric/devices', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    const currentDeviceId = req.query.currentDeviceId;

    const devices = user.trustedDevices.map((d) => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      deviceModel: d.deviceModel,
      platform: d.platform,
      biometricEnabled: d.biometricEnabled,
      biometricType: d.biometricType,
      lastLogin: d.lastLogin,
      createdAt: d.createdAt,
      isCurrent: d.deviceId === currentDeviceId,
    }));

    res.json({
      success: true,
      devices,
      biometricLogin: user.preferences?.biometricLogin || false,
    });
  } catch (err) {
    res.status(500).json({ msg: 'خطأ' });
  }
});

// ==================== 5. حالة البصمة للمستخدم ====================
router.get('/biometric/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    const currentDeviceId = req.query.deviceId;
    const device = currentDeviceId
      ? user.trustedDevices.find((d) => d.deviceId === currentDeviceId)
      : null;

    res.json({
      success: true,
      biometricLogin: user.preferences?.biometricLogin || false,
      hasTrustedDevices: user.trustedDevices.length > 0,
      totalDevices: user.trustedDevices.length,
      currentDevice: device
        ? {
            deviceId: device.deviceId,
            biometricEnabled: device.biometricEnabled,
            biometricType: device.biometricType,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ msg: 'خطأ' });
  }
});

module.exports = router;