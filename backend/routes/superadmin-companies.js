// 📁 backend/routes/superadmin-companies.js
// ⬅️ استبدل الملف بالكامل

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Company = require('../models/Company');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

// ✅ Middleware: SuperAdmin فقط
function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ msg: '⛔ SuperAdmin فقط' });
  }
  next();
}

// ============================================
// ✅ GET /api/superadmin/companies
// قائمة كل الشركات
// ============================================
router.get('/companies', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 100 } = req.query;

    const filter = {};
    if (status) filter['subscription.status'] = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Company.countDocuments(filter),
    ]);

    // ✅ ضيف عدد المستخدمين لكل شركة
    const withCounts = await Promise.all(
      companies.map(async (c) => {
        const usersCount = await User.countDocuments({ companyId: c._id });
        return { ...c, usersCount };
      })
    );

    res.json({
      success: true,
      data: withCounts,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('GET companies error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/superadmin/companies/:id/admin
// جلب بيانات الأدمن (للتعديل من المنصة)
// ============================================
router.get('/companies/:id/admin', auth, requireSuperAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({
      companyId: req.params.id,
      companyRole: 'company_owner',
    }).select('name email');

    if (!admin) {
      return res.status(404).json({ msg: 'مفيش أدمن للشركة' });
    }

    res.json({ admin });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ POST /api/superadmin/companies
// إنشاء شركة جديدة (+ admin اختياري)
// ============================================
router.post('/companies', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, email, phone, type, subscription, admin } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ msg: 'الاسم والـ slug مطلوبان' });
    }

    const exists = await Company.findOne({ slug });
    if (exists) {
      return res.status(400).json({ msg: 'الـ slug مستخدم بالفعل' });
    }

    const company = await Company.create({
      name,
      slug,
      contactEmail: email,
      contactPhone: phone,
      type: type || 'external',
      createdBy: req.user.id || req.user._id,
      subscription: {
        plan: subscription?.plan || 'trial',
        status: subscription?.status || 'trial',
        maxEmployees: subscription?.maxEmployees || 10,
        billing: {
          amount: subscription?.billing?.amount || 0,
          cycle: subscription?.billing?.cycle || 'monthly',
        },
        isTrial: subscription?.status === 'trial',
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    // ✅ إنشاء الأدمن (اختياري)
    let adminUser = null;
    if (admin?.email && admin?.password) {
      const existingUser = await User.findOne({ email: admin.email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        adminUser = await User.create({
          name: admin.name || admin.email,
          email: admin.email,
          password: hashedPassword,
          role: 'superadmin',
          companyRole: 'company_owner',
          companyId: company._id,
          active: true,
        });
      }
    }

    // ✅ Audit Log
    await AuditLog.create({
      companyId: company._id,
      user: req.user.id || req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: 'superadmin',
      action: 'create',
      resource: 'company',
      resourceId: company._id,
      description: `إنشاء شركة: ${name}`,
      status: 'success',
    });

    res.status(201).json({
      success: true,
      data: company,
      admin: adminUser
        ? { _id: adminUser._id, name: adminUser.name, email: adminUser.email }
        : null,
    });
  } catch (err) {
    console.error('POST companies error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ PATCH /api/superadmin/companies/:id
// تعديل شركة + تعديل بيانات الأدمن (اختياري)
// ============================================
router.patch('/companies/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminEmail, adminPassword, ...companyUpdates } = req.body;

    delete companyUpdates._id;
    delete companyUpdates.createdAt;
    delete companyUpdates.updatedAt;

    // ✅ تحديث الشركة
    const company = await Company.findByIdAndUpdate(id, companyUpdates, {
      new: true,
      runValidators: true,
    });

    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    // ✅ تحديث الأدمن (لو إيميل أو باسورد اتغير)
    if (adminEmail || adminPassword) {
      const admin = await User.findOne({
        companyId: company._id,
        companyRole: 'company_owner',
      });

      if (admin) {
        if (adminEmail && adminEmail.toLowerCase() !== admin.email.toLowerCase()) {
          const exists = await User.findOne({ 
            email: adminEmail.toLowerCase(), 
            _id: { $ne: admin._id } 
          });
          if (exists) {
            return res.status(400).json({ msg: '❌ الإيميل مستخدم بالفعل' });
          }
          admin.email = adminEmail.toLowerCase();
        }

        if (adminPassword) {
          if (adminPassword.length < 6) {
            return res.status(400).json({ msg: '❌ الباسورد 6 أحرف على الأقل' });
          }
          admin.password = await bcrypt.hash(adminPassword, 10);
        }

        await admin.save();
      }
    }

    // ✅ Audit Log
    await AuditLog.create({
      companyId: company._id,
      user: req.user.id || req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: 'superadmin',
      action: 'update',
      resource: 'company',
      resourceId: company._id,
      description: `تعديل شركة: ${company.name}`,
      status: 'success',
    });

    res.json({ success: true, data: company });
  } catch (err) {
    console.error('PATCH company error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ DELETE /api/superadmin/companies/:id
// حذف شركة (+ كل مستخدميها)
// ============================================
router.delete('/companies/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    await User.deleteMany({ companyId: id });
    await company.deleteOne();

    await AuditLog.create({
      companyId: null,
      user: req.user.id || req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: 'superadmin',
      action: 'delete',
      resource: 'company',
      resourceId: id,
      description: `حذف شركة: ${company.name}`,
      status: 'success',
    });

    res.json({ success: true, msg: 'تم حذف الشركة وكل مستخدميها' });
  } catch (err) {
    console.error('DELETE company error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ POST /api/superadmin/companies/:id/impersonate
// دخول جوّه شركة (Impersonate) — SuperAdmin فقط
// ============================================
router.post(
  '/companies/:id/impersonate',
  auth,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const company = await Company.findById(id).lean();
      if (!company) {
        return res.status(404).json({ msg: 'الشركة غير موجودة' });
      }

      const token = jwt.sign(
        {
          id: req.user.id || req.user._id,
          role: req.user.role,
          email: req.user.email,
          name: req.user.name,
          companyId: company._id.toString(),
          isImpersonating: true,
          originalCompanyId: req.user.companyId || null,
          originalRole: req.user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      await AuditLog.create({
        companyId: company._id,
        user: req.user.id || req.user._id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: 'superadmin',
        action: 'impersonate',
        resource: 'company',
        resourceId: company._id,
        description: `SuperAdmin دخل شركة: ${company.name}`,
        status: 'success',
      });

      res.json({
        success: true,
        token,
        company: {
          _id: company._id,
          name: company.name,
          slug: company.slug,
          type: company.type,
          subscription: company.subscription,
        },
      });
    } catch (err) {
      console.error('Impersonate error:', err);
      res.status(500).json({ msg: err.message });
    }
  }
);

module.exports = router;