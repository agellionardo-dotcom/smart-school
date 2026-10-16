const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { sendResetPasswordEmail } = require('../utils/emailService');
const { logAction } = require('../middleware/auditLog');

// ============================================
// ✅ Helper: إنشاء JWT
// ============================================
function generateToken(user, branchId = null) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      companyId: user.companyId,
      companyRole: user.companyRole,
      branch: branchId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// ============================================
// ✅ Helper: تجهيز بيانات المستخدم للرد
// ============================================
async function prepareUserResponse(user) {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

  // جلب بيانات الشركة
  if (user.companyId) {
    const company = await Company.findById(user.companyId)
      .select('name slug logo type subscription.plan subscription.status subscription.isTrial subscription.endDate');
    userObj.company = company;
  }

  return userObj;
}

// ============================================
// ✅ 1. تسجيل الدخول
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'البريد وكلمة المرور مطلوبين' });
    }

    // ✅ 1. نجيب المستخدم (بدون شرط companyId — عشان نقدر نسجل الـ login_failed)
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('branch')
      .populate('companyId', 'name slug logo type active subscription');

    // ❌ مستخدم غير موجود
    if (!user) {
      await logAction({
        req,
        action: 'login_failed',
        resource: 'auth',
        description: `محاولة دخول فاشلة: ${email}`,
        status: 'failed',
        statusCode: 400,
        companyIdOverride: null, // ← مفيش شركة
        details: { email, reason: 'user_not_found' },
      }).catch(() => {}); // ← مش مهم لو فشل
      return res.status(400).json({ msg: 'البريد أو كلمة المرور خطأ' });
    }

    // ❌ كلمة مرور خطأ
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await logAction({
        req,
        action: 'login_failed',
        resource: 'auth',
        description: `محاولة دخول فاشلة: ${email}`,
        status: 'failed',
        statusCode: 400,
        companyIdOverride: user.companyId?._id,
        userOverride: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        details: { email, reason: 'wrong_password' },
      });
      return res.status(400).json({ msg: 'البريد أو كلمة المرور خطأ' });
    }

    // ❌ حساب موقوف
    if (!user.active) {
      await logAction({
        req,
        action: 'login_failed',
        resource: 'auth',
        description: `محاولة دخول لحساب موقوف: ${email}`,
        status: 'failed',
        statusCode: 403,
        companyIdOverride: user.companyId?._id,
        userOverride: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        details: { email, reason: 'account_inactive' },
      });
      return res.status(403).json({ msg: 'الحساب موقوف ⚠️' });
    }

    // ❌ الشركة موقوفة (لو مش SuperAdmin)
    if (user.role !== 'superadmin' && user.companyId) {
      const company = user.companyId;
      if (!company.active) {
        return res.status(403).json({
          msg: 'الشركة موقوفة — تواصل مع الدعم',
          code: 'COMPANY_SUSPENDED',
        });
      }

      // فحص الاشتراك
      const status = company.subscription?.status;
      if (['suspended', 'cancelled', 'expired'].includes(status)) {
        return res.status(403).json({
          msg: 'الاشتراك منتهي — تواصل مع الدعم',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }
    }

    // ✅ تحديث lastLogin
    user.lastLogin = new Date();
    await user.save();

    // ✅ إنشاء token
    const token = generateToken(user, user.branch?._id);

    // ✅ تجهيز الرد
    const userResponse = await prepareUserResponse(user);

    // ✅ تسجيل الدخول الناجح
    await logAction({
      req,
      action: 'login',
      resource: 'auth',
      description: `تسجيل دخول ناجح`,
      status: 'success',
      statusCode: 200,
      companyIdOverride: user.companyId?._id,
      userOverride: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      details: {
        email: user.email,
        role: user.role,
        companyRole: user.companyRole,
        branch: user.branch?.name || null,
      },
    });

    res.json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 2. تسجيل مستخدم جديد
// ============================================
// ⚠️ محمي — بس للـ SuperAdmin / Company Owner
// ============================================
router.post('/register', auth, tenant, async (req, res) => {
  try {
    // ✅ فحص الصلاحيات
    const allowedRoles = ['superadmin', 'company_owner', 'hr'];
    const userRole = req.user.companyRole || req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    const { name, email, password, branch, role, companyRole } = req.body;

    // ✅ companyId إجباري
    if (!req.companyId) {
      return res.status(400).json({ msg: 'companyId مطلوب' });
    }

    // ✅ validation
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'الاسم، البريد، وكلمة المرور مطلوبين' });
    }

    // ✅ فحص الإيميل
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ msg: 'البريد مستخدم بالفعل' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      companyId: req.companyId,
      name,
      email: email.toLowerCase(),
      password: hashed,
      branch: branch || null,
      role: role || 'employee',
      companyRole: companyRole || 'employee',
      createdBy: req.user.id,
    });

    await logAction({
      req,
      action: 'create',
      resource: 'user',
      resourceId: user._id,
      description: `إنشاء مستخدم جديد: ${name}`,
      details: { email, role, companyRole },
    });

    const userResponse = await prepareUserResponse(user);

    res.status(201).json({
      success: true,
      message: '✅ تم إنشاء المستخدم',
      user: userResponse,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 3. معلومات المستخدم الحالي
// ============================================
router.get('/me', auth, tenant, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('branch')
      .populate('companyId');

    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    const userResponse = await prepareUserResponse(user);

    res.json({
      success: true,
      user: userResponse,
      trialDaysLeft: req.trialDaysLeft || null,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 4. طلب إعادة تعيين كلمة المرور
// ============================================
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
        resetUrl,
      });
      res.json({ msg: genericMsg, sent: true });
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      res.status(500).json({ msg: 'فشل إرسال الإيميل' });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 5. التحقق من صلاحية الـ token
// ============================================
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ valid: false, msg: 'الرابط غير صالح أو منتهي' });
    }

    res.json({ valid: true, email: user.email, name: user.name });
  } catch (err) {
    res.status(500).json({ valid: false, msg: err.message });
  }
});

// ============================================
// ✅ 6. إعادة تعيين كلمة المرور
// ============================================
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
      resetPasswordExpires: { $gt: Date.now() },
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

// ==================== 1. تفعيل البصمة ====================
router.post('/biometric/enable', auth, tenant, async (req, res) => {
  try {
    const { deviceId, deviceName, deviceModel, platform, biometricType } = req.body;

    if (!deviceId) {
      return res.status(400).json({ msg: 'deviceId مطلوب' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    const existingDevice = user.trustedDevices.find((d) => d.deviceId === deviceId);

    const refreshToken = jwt.sign(
      {
        id: user._id,
        companyId: user.companyId,
        deviceId,
        type: 'biometric_refresh',
      },
      process.env.JWT_SECRET,
      { expiresIn: '60d' }
    );

    const hashedToken = await bcrypt.hash(refreshToken, 10);

    if (existingDevice) {
      existingDevice.biometricEnabled = true;
      existingDevice.biometricType = biometricType || 'fingerprint';
      existingDevice.refreshToken = hashedToken;
      existingDevice.lastLogin = new Date();
      existingDevice.deviceName = deviceName || existingDevice.deviceName;
      existingDevice.deviceModel = deviceModel || existingDevice.deviceModel;
      existingDevice.platform = platform || existingDevice.platform;
    } else {
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
      .populate('branch')
      .populate('companyId', 'name slug logo type active subscription');

    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    if (!user.active) {
      return res.status(403).json({ msg: 'الحساب معطّل — راجع المدير' });
    }

    // فحص الشركة
    if (user.role !== 'superadmin' && user.companyId) {
      const company = user.companyId;
      if (!company.active || ['suspended', 'cancelled', 'expired'].includes(company.subscription?.status)) {
        return res.status(403).json({ msg: 'الشركة موقوفة أو الاشتراك منتهي' });
      }
    }

    const device = user.trustedDevices.find((d) => d.deviceId === deviceId);
    if (!device || !device.biometricEnabled) {
      return res.status(401).json({ msg: 'الجهاز غير موثوق' });
    }

    const isValid = await bcrypt.compare(refreshToken, device.refreshToken);
    if (!isValid) {
      return res.status(401).json({ msg: 'token غير صالح' });
    }

    device.lastLogin = new Date();
    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateToken(user, user.branch?._id);
    const userResponse = await prepareUserResponse(user);

    res.json({
      success: true,
      token: accessToken,
      user: userResponse,
    });
  } catch (err) {
    console.error('Biometric login error:', err);
    res.status(500).json({ msg: 'خطأ في تسجيل الدخول' });
  }
});

// ==================== 3. إلغاء تفعيل البصمة لجهاز ====================
router.post('/biometric/disable', auth, tenant, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    user.trustedDevices = user.trustedDevices.filter(
      (d) => d.deviceId !== deviceId
    );

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
router.get('/biometric/devices', auth, tenant, async (req, res) => {
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
router.get('/biometric/status', auth, tenant, async (req, res) => {
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
// ============================================
// ✅ 7. تغيير كلمة المرور
// ============================================
router.post('/change-password', auth, tenant, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // ✅ Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        msg: 'كلمة المرور الحالية والجديدة مطلوبين',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        msg: 'كلمة المرور الجديدة 8 أحرف على الأقل',
      });
    }

    // ✅ نجيب المستخدم
    const user = await User.findOne({
      _id: req.user.id,
      companyId: req.companyId,
    });

    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    // ✅ نتأكد من كلمة المرور الحالية
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        msg: 'كلمة المرور الحالية غلط',
      });
    }

    // ✅ نتأكد إن الجديدة مختلفة
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({
        msg: 'كلمة المرور الجديدة لازم تكون مختلفة',
      });
    }

    // ✅ نشفر ونحفظ
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // ✅ نسجل في Audit Log
    await logAction({
      req,
      action: 'update',
      resource: 'user',
      resourceId: user._id,
      description: 'تغيير كلمة المرور',
      details: {
        userEmail: user.email,
        changedAt: new Date(),
      },
    });

    res.json({
      success: true,
      msg: '✅ تم تغيير كلمة المرور بنجاح',
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ msg: err.message });
  }
});
module.exports = router;