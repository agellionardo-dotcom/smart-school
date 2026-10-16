const router = require('express').Router();
const Branch = require('../models/Branch');
const User = require('../models/User');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { logAction } = require('../middleware/auditLog');

// ============================================
// ✅ 1. جلب كل الفروع (نفس الشركة فقط)
// ============================================
router.get('/', auth, tenant, async (req, res) => {
  try {
    // ✅ نجيب فروع الشركة بس
    const branches = await Branch.find({
      companyId: req.companyId,   // ← ✅
    })
      .populate('manager', 'name email position')
      .select('name type radius location manager parent active createdAt');

    res.json(branches);
  } catch (err) {
    console.error('Get branches error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 2. جلب فرع واحد
// ============================================
router.get('/:id', auth, tenant, async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    }).populate('manager', 'name email position');

    if (!branch) {
      return res.status(404).json({ msg: 'الفرع غير موجود' });
    }

    // ✅ عدد الموظفين في الفرع
    const employeesCount = await User.countDocuments({
      companyId: req.companyId,
      branch: branch._id,
      active: true,
    });

    res.json({
      ...branch.toObject(),
      employeesCount,
    });
  } catch (err) {
    console.error('Get branch error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 3. إضافة فرع جديد
// ============================================
router.post('/', auth, tenant, async (req, res) => {
  try {
    // ✅ فحص الصلاحيات
    const role = req.user.companyRole || req.user.role;
    const allowed = ['superadmin', 'company_owner', 'hr'];

    if (!allowed.includes(role) && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    const { name, type, address, location, radius, phone, manager } = req.body;

    // ✅ Validation
    if (!name) {
      return res.status(400).json({ msg: 'اسم الفرع مطلوب' });
    }

    // ✅ فحص حد الفروع للشركة
    const branchesCount = await Branch.countDocuments({
      companyId: req.companyId,
    });

    if (
      req.company &&
      branchesCount >= req.company.subscription.maxBranches
    ) {
      return res.status(403).json({
        msg: `⚠️ وصلت للحد الأقصى للفروع (${req.company.subscription.maxBranches})`,
        code: 'MAX_BRANCHES_REACHED',
      });
    }

    // ✅ لو الفرع الرئيسي — نتأكد إن مفيش فرع رئيسي تاني
    if (type === 'main') {
      const existingMain = await Branch.findOne({
        companyId: req.companyId,
        type: 'main',
      });
      if (existingMain) {
        return res.status(400).json({
          msg: '⚠️ يوجد فرع رئيسي بالفعل',
        });
      }
    }

    const branch = await Branch.create({
      companyId: req.companyId,   // ← ✅
      name,
      type: type || 'sub',
      address: address || '',
      location: location || { lat: 0, lng: 0 },
      radius: radius || 100,
      phone: phone || '',
      manager: manager || null,
      active: true,
    });

    // ✅ تسجيل في Audit Log
    await logAction({
      req,
      action: 'create',
      resource: 'branch',
      resourceId: branch._id,
      description: `إنشاء فرع جديد: ${name}`,
      details: { name, type },
    });

    res.status(201).json(branch);
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 4. تعديل فرع
// ============================================
router.put('/:id', auth, tenant, async (req, res) => {
  try {
    // ✅ فحص الصلاحيات
    const role = req.user.companyRole || req.user.role;
    const allowed = ['superadmin', 'company_owner', 'hr'];

    if (!allowed.includes(role) && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    // ✅ نضمن إن الفرع من نفس الشركة
    const branch = await Branch.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!branch) {
      return res.status(404).json({ msg: 'الفرع غير موجود' });
    }

    const before = {
      name: branch.name,
      type: branch.type,
      radius: branch.radius,
      location: branch.location,
      manager: branch.manager,
      active: branch.active,
    };

    // ✅ نمنع تغيير companyId
    const updates = { ...req.body };
    delete updates.companyId;
    delete updates._id;

    // ✅ لو بيغير النوع لـ main — نتأكد
    if (updates.type === 'main' && branch.type !== 'main') {
      const existingMain = await Branch.findOne({
        companyId: req.companyId,
        type: 'main',
        _id: { $ne: branch._id },
      });
      if (existingMain) {
        return res.status(400).json({
          msg: '⚠️ يوجد فرع رئيسي بالفعل',
        });
      }
    }

    Object.assign(branch, updates);
    await branch.save();

    await logAction({
      req,
      action: 'update',
      resource: 'branch',
      resourceId: branch._id,
      description: `تعديل فرع: ${branch.name}`,
      changes: {
        before,
        after: {
          name: branch.name,
          type: branch.type,
          radius: branch.radius,
          location: branch.location,
          manager: branch.manager,
          active: branch.active,
        },
      },
    });

    res.json(branch);
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 5. حذف فرع
// ============================================
router.delete('/:id', auth, tenant, async (req, res) => {
  try {
    // ✅ فحص الصلاحيات — SuperAdmin / Company Owner فقط
    const role = req.user.companyRole || req.user.role;
    const allowed = ['superadmin', 'company_owner'];

    if (!allowed.includes(role) && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    // ✅ نضمن إن الفرع من نفس الشركة
    const branch = await Branch.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!branch) {
      return res.status(404).json({ msg: 'الفرع غير موجود' });
    }

    // ✅ منع حذف الفرع الرئيسي
    if (branch.type === 'main') {
      return res.status(400).json({
        msg: '⛔ لا يمكن حذف الفرع الرئيسي',
      });
    }

    // ✅ فحص: هل فيه موظفين في الفرع؟
    const employeesCount = await User.countDocuments({
      companyId: req.companyId,
      branch: branch._id,
      active: true,
    });

    if (employeesCount > 0) {
      return res.status(400).json({
        msg: `⚠️ فيه ${employeesCount} موظف في الفرع — انقلهم أولاً`,
        code: 'BRANCH_HAS_EMPLOYEES',
        employeesCount,
      });
    }

    // ✅ Soft delete بدل الحذف الفعلي
    branch.active = false;
    await branch.save();

    await logAction({
      req,
      action: 'delete',
      resource: 'branch',
      resourceId: branch._id,
      description: `حذف فرع: ${branch.name}`,
      details: { name: branch.name, type: branch.type },
    });

    res.json({
      success: true,
      msg: '✅ تم حذف الفرع',
      branch,
    });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;