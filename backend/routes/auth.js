// 📁 backend/routes/auth.js
// ⬅️ استبدل الملف بالكامل

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const Branch = require('../models/Branch'); // ✅ ضيفناها
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { sendResetPasswordEmail, sendWelcomeEmail } = require('../utils/emailService');
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
// ✅ Helper: تجهيز بيانات المستخدم
// ============================================
async function prepareUserResponse(user) {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

  // ✅ تأكد إن role و companyRole و companyId و branch موجودين
  userObj.role = user.role;
  userObj.companyRole = user.companyRole;
  userObj.companyId = user.companyId;
  userObj.branch = user.branch;

  if (user.companyId) {
    const company = await Company.findById(user.companyId).select(
      'name slug logo type subscription.plan subscription.status subscription.isTrial subscription.endDate'
    );
    userObj.company = company;
  }

  // ✅ populate الفرع عشان نعرف type (main/sub)
  if (user.branch) {
    const branchData = await Branch.findById(user.branch).select('name type _id');
    userObj.branchData = branchData;
  }

  return userObj;
}

// ============================================
// ✅ 1. تسجيل شركة جديدة (Self-Service SignUp)
// ============================================
router.post('/signup', async (req, res) => {
  try {
    const { companyName, slug, email, phone, password, plan } = req.body;

    if (!companyName || !email || !password) {
      return res.status(400).json({ msg: 'الاسم، البريد، وكلمة المرور مطلوبين' });
    }

    if (password.length < 6) {
      return res.status(400).json({ msg: 'كلمة المرور 6 أحرف على الأقل' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ msg: 'البريد مستخدم بالفعل' });
    }

    let finalSlug = slug?.toLowerCase().replace(/[^a-z0-9-]/g, '') ||
      companyName.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);

    if (!finalSlug) finalSlug = `company-${Date.now()}`;

    const existingCompany = await Company.findOne({ slug: finalSlug });
    if (existingCompany) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const company = new Company({
      name: companyName,
      slug: finalSlug,
      contactEmail: email.toLowerCase(),
      contactPhone: phone || null,
      type: 'external',
      subscription: {
        plan: plan || 'trial',
        status: 'pending_verification',
        isTrial: true,
        maxEmployees: plan === 'basic' ? 25 : plan === 'pro' ? 100 : 999999,
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    const verificationToken = company.generateEmailVerificationToken();
    await company.save();

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      companyId: company._id,
      name: companyName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'employee',
      companyRole: 'company_owner',
      active: true,
    });

    company.ownerId = user._id;
    await company.save();

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

    try {
      await sendWelcomeEmail({
        to: email,
        name: companyName,
        companyName,
        username: email,
        password,
        plan: plan || 'trial',
        trialEndsAt: company.subscription.endDate,
      });

      console.log('📧 Verification URL:', verificationUrl);
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }

    await logAction({
      req,
      action: 'signup',
      resource: 'company',
      resourceId: company._id,
      description: `تسجيل شركة جديدة: ${companyName}`,
      status: 'success',
      statusCode: 201,
      userOverride: { id: user._id, email: user.email, name: user.name, role: user.role },
      details: { companyName, plan, email },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      msg: '✅ تم إنشاء الحساب! تم إرسال بيانات الدخول على بريدك الإلكتروني.',
      company: {
        _id: company._id,
        name: company.name,
        slug: company.slug,
        status: company.subscription.status,
      },
    });
  } catch (err) {
    console.error('SignUp error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 2. تفعيل الإيميل
// ============================================
router.get('/verify-email/:token', async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const company = await Company.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!company) {
      return res.status(400).json({
        success: false,
        msg: 'رابط التفعيل غير صالح أو منتهي',
      });
    }

    company.isEmailVerified = true;
    company.emailVerificationToken = null;
    company.emailVerificationExpires = null;
    company.subscription.status = 'trial';
    await company.save();

    res.json({
      success: true,
      msg: '✅ تم تفعيل الحساب بنجاح! يمكنك تسجيل الدخول الآن.',
      company: { name: company.name, slug: company.slug },
    });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

// ============================================
// ✅ 3. إعادة إرسال رابط التفعيل
// ============================================
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ msg: 'البريد غير موجود' });
    }

    const company = await Company.findById(user.companyId);
    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    if (company.isEmailVerified) {
      return res.status(400).json({ msg: 'الحساب مفعل بالفعل' });
    }

    const verificationToken = company.generateEmailVerificationToken();
    await company.save();

    try {
      await sendWelcomeEmail({
        to: email,
        name: company.name,
        companyName: company.name,
        username: email,
        password: '••••••••',
        plan: company.subscription.plan,
        trialEndsAt: company.subscription.endDate,
      });
    } catch (emailErr) {
      return res.status(500).json({ msg: 'فشل إرسال الإيميل' });
    }

    res.json({ success: true, msg: '✅ تم إعادة إرسال رابط التفعيل' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 4. تسجيل الدخول
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'البريد وكلمة المرور مطلوبين' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('branch')
      .populate('companyId', 'name slug logo type active subscription');

    if (!user) {
      await logAction({
        req,
        action: 'login_failed',
        resource: 'auth',
        description: `محاولة دخول فاشلة: ${email}`,
        status: 'failed',
        statusCode: 400,
        companyIdOverride: null,
        details: { email, reason: 'user_not_found' },
      }).catch(() => {});
      return res.status(400).json({ msg: 'البريد أو كلمة المرور خطأ' });
    }

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

    if (user.role !== 'superadmin' && user.companyId) {
      const company = user.companyId;
      if (!company.active) {
        return res.status(403).json({
          msg: 'الشركة موقوفة — تواصل مع الدعم',
          code: 'COMPANY_SUSPENDED',
        });
      }

      const status = company.subscription?.status;
      if (['suspended', 'cancelled', 'expired'].includes(status)) {
        return res.status(403).json({
          msg: 'الاشتراك منتهي — تواصل مع الدعم',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user, user.branch?._id);
    const userResponse = await prepareUserResponse(user);

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
// ✅ 5. تسجيل مستخدم جديد (من داخل الشركة)
// ============================================
router.post('/register', auth, tenant, async (req, res) => {
  try {
    const allowedRoles = ['superadmin', 'company_owner', 'hr'];
    const userRole = req.user.companyRole || req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    const { name, email, password, branch, role, companyRole } = req.body;

    if (!req.companyId) {
      return res.status(400).json({ msg: 'companyId مطلوب' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'الاسم، البريد، وكلمة المرور مطلوبين' });
    }

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
// ✅ 6. معلومات المستخدم الحالي
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
// ✅ 7. طلب إعادة تعيين كلمة المرور
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
// ✅ 8. التحقق من صلاحية الـ token
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
// ✅ 9. إعادة تعيين كلمة المرور
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
// ✅ 10. Biometric Login (Enable)
// ============================================
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

// ============================================
// ✅ 11. Biometric Login (Login)
// ============================================
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

// ============================================
// ✅ 12. Biometric Login (Disable)
// ============================================
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

// ============================================
// ✅ 13. Biometric Devices
// ============================================
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

// ============================================
// ✅ 14. Biometric Status
// ============================================
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
// ✅ 15. تغيير كلمة المرور
// ============================================
router.post('/change-password', auth, tenant, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

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

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        msg: 'كلمة المرور الحالية غلط',
      });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({
        msg: 'كلمة المرور الجديدة لازم تكون مختلفة',
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

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

// ============================================
// ✅ EXPORT
// ============================================
module.exports = router;