const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Company = require('../models/Company');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const { logAction } = require('../middleware/auditLog');

// ============================================
// ✅ Middleware: SuperAdmin فقط
// ============================================
function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({
      msg: '⛔ SuperAdmin فقط',
      code: 'NOT_SUPER_ADMIN',
    });
  }
  next();
}

// ============================================
// ✅ Helper: توليد slug فريد
// ============================================
async function generateUniqueSlug(baseName) {
  let slug = baseName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);

  if (!slug) slug = 'company';

  let finalSlug = slug;
  let counter = 1;

  while (await Company.exists({ slug: finalSlug })) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return finalSlug;
}

// ============================================
// ✅ Helper: توليد كلمة مرور قوية
// ============================================
function generatePassword(length = 12) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================
// ✅ GET /api/companies
// كل الشركات (SuperAdmin فقط)
// ============================================
router.get('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      type,
      sort = '-createdAt',
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter['subscription.status'] = status;
    if (type) filter.type = type;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('ownerId', 'name email')
        .lean(),
      Company.countDocuments(filter),
    ]);

    // نضيف عدد المستخدمين لكل شركة
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const usersCount = await User.countDocuments({
          companyId: company._id,
          active: true,
        });
        const branchesCount = await Branch.countDocuments({
          companyId: company._id,
        });
        return {
          ...company,
          stats: {
            ...company.stats,
            totalUsers: usersCount,
            totalBranches: branchesCount,
          },
        };
      })
    );

    res.json({
      success: true,
      data: companiesWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Get companies error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ POST /api/companies
// إنشاء شركة جديدة (SuperAdmin فقط)
// ============================================
router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      slug: requestedSlug,
      logo,
      description,
      type = 'external',
      contactEmail,
      contactPhone,
      address,
      settings,
      subscription,
      ownerName,
      ownerEmail,
      ownerPassword,
      createDefaultBranch = true,
    } = req.body;

    // ============================================
    // ✅ Validation
    // ============================================
    if (!name || !ownerName || !ownerEmail) {
      return res.status(400).json({
        msg: 'اسم الشركة، اسم المدير، وإيميل المدير مطلوبين',
      });
    }

    // فحص الإيميل مش مستخدم
    const existingUser = await User.findOne({
      email: ownerEmail.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({
        msg: 'الإيميل مستخدم بالفعل',
      });
    }

    // ============================================
    // ✅ 1. إنشاء الشركة
    // ============================================
    const slug = requestedSlug
      ? await generateUniqueSlug(requestedSlug)
      : await generateUniqueSlug(name);

    // إعدادات افتراضية
    const defaultSettings = {
      workStartTime: '08:00',
      workEndTime: '14:00',
      lateGraceMinutes: 15,
      weekendDays: [5, 6],
      timezone: 'Africa/Cairo',
      currency: 'EGP',
      language: 'ar',
      ...settings,
    };

    // اشتراك افتراضي (Trial 14 يوم)
    const defaultSubscription = {
      plan: 'trial',
      status: 'trial',
      isTrial: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      maxEmployees: 10,
      maxBranches: 2,
      features: ['attendance', 'leaves', 'announcements', 'qr'],
      billing: {
        amount: 0,
        currency: 'EGP',
        cycle: 'monthly',
      },
      ...subscription,
    };

    const company = await Company.create({
      name,
      slug,
      logo: logo || null,
      description: description || '',
      type,
      contactEmail: contactEmail || ownerEmail,
      contactPhone: contactPhone || null,
      address: address || '',
      settings: defaultSettings,
      subscription: defaultSubscription,
      createdBy: req.user.id,
      active: true,
    });

    // ============================================
    // ✅ 2. إنشاء المستخدم (Owner)
    // ============================================
    const password = ownerPassword || generatePassword(12);
    const hashedPassword = await bcrypt.hash(password, 10);

    const owner = await User.create({
      companyId: company._id,
      name: ownerName,
      email: ownerEmail.toLowerCase(),
      password: hashedPassword,
      role: 'manager',                    // الدور العام
      companyRole: 'company_owner',        // الدور في الشركة
      active: true,
      createdBy: req.user.id,
    });

    // ربط الـ owner بالشركة
    company.ownerId = owner._id;
    await company.save();

    // ============================================
    // ✅ 3. إنشاء فرع رئيسي (اختياري)
    // ============================================
    let defaultBranch = null;
    if (createDefaultBranch) {
      defaultBranch = await Branch.create({
        companyId: company._id,
        name: 'الفرع الرئيسي',
        type: 'main',
        address: address || '',
        active: true,
      });
    }

    // ============================================
    // ✅ 4. إنشاء إعدادات الشركة
    // ============================================
    await Settings.create({
      companyId: company._id,
      schoolName: name,
      logo: logo || null,
      workStartTime: defaultSettings.workStartTime,
      workEndTime: defaultSettings.workEndTime,
      lateGraceMinutes: defaultSettings.lateGraceMinutes,
    });

    // ============================================
    // ✅ 5. تسجيل في Audit Log
    // ============================================
    await logAction({
      req,
      action: 'company_created',
      resource: 'company',
      resourceId: company._id,
      description: `إنشاء شركة: ${name}`,
      companyIdOverride: company._id,
      userOverride: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: 'superadmin',
      },
      details: {
        companyName: name,
        slug,
        ownerName,
        ownerEmail,
      },
    });

    // ============================================
    // ✅ 6. الرد
    // ============================================
    res.status(201).json({
      success: true,
      message: '✅ تم إنشاء الشركة بنجاح',
      company: {
        _id: company._id,
        name: company.name,
        slug: company.slug,
        type: company.type,
        subscription: {
          plan: company.subscription.plan,
          status: company.subscription.status,
          endDate: company.subscription.endDate,
        },
        createdAt: company.createdAt,
      },
      owner: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        companyRole: owner.companyRole,
      },
      credentials: {
        loginUrl: `https://smart-school-delta-amber.vercel.app`,
        email: owner.email,
        password: password,       // ← يظهر مرة واحدة فقط
        note: '⚠️ احتفظ بكلمة المرور — لن تظهر مرة أخرى',
      },
      defaultBranch: defaultBranch
        ? { _id: defaultBranch._id, name: defaultBranch.name }
        : null,
    });
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/companies/:id
// تفاصيل شركة
// ============================================
router.get('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('ownerId', 'name email phone')
      .populate('createdBy', 'name email')
      .lean();

    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    const [usersCount, branchesCount, settings] = await Promise.all([
      User.countDocuments({ companyId: company._id, active: true }),
      Branch.countDocuments({ companyId: company._id }),
      Settings.findOne({ companyId: company._id }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        ...company,
        stats: {
          totalUsers: usersCount,
          totalBranches: branchesCount,
        },
        settings,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ PATCH /api/companies/:id
// تعديل شركة
// ============================================
router.patch('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    const before = {
      name: company.name,
      type: company.type,
      active: company.active,
      subscription: company.subscription.toObject(),
    };

    const allowedUpdates = [
      'name',
      'logo',
      'description',
      'type',
      'contactEmail',
      'contactPhone',
      'address',
      'settings',
      'active',
      'notes',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    // تعديل الاشتراك
    if (req.body.subscription) {
      Object.assign(company.subscription, req.body.subscription);
    }

    await company.save();

    await logAction({
      req,
      action: 'company_updated',
      resource: 'company',
      resourceId: company._id,
      description: `تعديل شركة: ${company.name}`,
      companyIdOverride: company._id,
      changes: {
        before,
        after: {
          name: company.name,
          type: company.type,
          active: company.active,
          subscription: company.subscription.toObject(),
        },
      },
    });

    res.json({
      success: true,
      message: '✅ تم التعديل بنجاح',
      data: company,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ POST /api/companies/:id/suspend
// تعليق شركة
// ============================================
router.post('/:id/suspend', auth, requireSuperAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    const { reason } = req.body;
    await company.suspendSubscription(reason || '');

    await logAction({
      req,
      action: 'company_suspended',
      resource: 'company',
      resourceId: company._id,
      description: `تعليق شركة: ${company.name}`,
      companyIdOverride: company._id,
      details: { reason },
    });

    res.json({
      success: true,
      message: '⏸️ تم تعليق الشركة',
      data: company,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ POST /api/companies/:id/activate
// تفعيل اشتراك
// ============================================
router.post('/:id/activate', auth, requireSuperAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    const { plan, amount, cycle = 'monthly', paymentMethod = 'manual', reference } = req.body;

    if (!plan || !amount) {
      return res.status(400).json({ msg: 'الخطة والمبلغ مطلوبين' });
    }

    await company.activateSubscription({
      plan,
      amount,
      cycle,
      paymentMethod,
      reference,
    });

    await logAction({
      req,
      action: 'subscription_activated',
      resource: 'company',
      resourceId: company._id,
      description: `تفعيل اشتراك: ${plan} — ${amount} ${company.subscription.currency}`,
      companyIdOverride: company._id,
      details: { plan, amount, cycle, paymentMethod },
    });

    res.json({
      success: true,
      message: '✅ تم تفعيل الاشتراك',
      data: company,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ DELETE /api/companies/:id
// حذف شركة (Soft Delete)
// ============================================
router.delete('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    // منع حذف الشركة الداخلية (SMART)
    if (company.type === 'internal') {
      return res.status(400).json({
        msg: '⛔ لا يمكن حذف الشركة الداخلية',
      });
    }

    company.active = false;
    company.subscription.status = 'cancelled';
    company.notes = `${company.notes}\n[${new Date().toISOString()}] تم الحذف بواسطة ${req.user.email}`;
    await company.save();

    await logAction({
      req,
      action: 'company_deleted',
      resource: 'company',
      resourceId: company._id,
      description: `حذف شركة: ${company.name}`,
      companyIdOverride: company._id,
    });

    res.json({
      success: true,
      message: '✅ تم حذف الشركة',
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/companies/stats/overview
// إحصائيات عامة (SuperAdmin)
// ============================================
router.get('/stats/overview', auth, requireSuperAdmin, async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      trialCompanies,
      totalUsers,
      companiesByType,
      companiesByPlan,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ active: true, 'subscription.status': 'active' }),
      Company.countDocuments({ 'subscription.status': 'trial' }),
      User.countDocuments({ active: true }),
      Company.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Company.aggregate([
        { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        trialCompanies,
        totalUsers,
        companiesByType,
        companiesByPlan,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;