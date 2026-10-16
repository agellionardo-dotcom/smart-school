const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { checkPermission, scopeToBranch, canAccessUser } = require('../middleware/permissions');
const { logAction } = require('../middleware/auditLog');

// ==================== helpers ====================
// جلب الفرع الرئيسي (type: 'main') — بنفس الشركة
const getHQBranch = async (companyId) => {
  return await Branch.findOne({ companyId, type: 'main' });
};

// التحقق إذا كان المستخدم hr في الفرع الرئيسي
const isHQHR = async (user, companyId) => {
  const role = user.companyRole || user.role;
  if (role !== 'hr') return false;
  if (!user.branch) return false;
  const hq = await getHQBranch(companyId);
  return hq && String(user.branch) === String(hq._id);
};

// جلب الفلتر المناسب للفروع حسب الدور
const getBranchFilter = async (user, companyId) => {
  // ✅ نجيب كل فروع الشركة
  const companyBranches = await Branch.find({ companyId }).select('_id');
  const branchIds = companyBranches.map((b) => b._id);

  const role = user.companyRole || user.role;

  // ✅ company_owner / superadmin / viewer → كل الفروع
  if (['company_owner', 'superadmin', 'viewer'].includes(role)) {
    return { companyId, _id: { $in: branchIds } };
  }

  // ✅ hr في الفرع الرئيسي → كل الفروع
  if (role === 'hr' && (await isHQHR(user, companyId))) {
    return { companyId, _id: { $in: branchIds } };
  }

  // ✅ hr في فرع تاني + manager → فرعه بس
  if (['hr', 'manager'].includes(role)) {
    return { companyId, _id: user.branch };
  }

  return { companyId };
};

// ==================== الفروع ====================

router.get('/branches', auth, tenant, checkPermission('branches.view.all'), async (req, res) => {
  try {
    const filter = await getBranchFilter(req.user, req.companyId);
    const branches = await Branch.find(filter).populate('manager', 'name email');
    res.json(branches);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/branches', auth, tenant, checkPermission('branches.create'), async (req, res) => {
  try {
    const branch = await Branch.create({
      ...req.body,
      companyId: req.companyId,  // ← ✅
    });

    await logAction({
      req,
      action: 'create',
      resource: 'branch',
      resourceId: branch._id,
      description: `إنشاء فرع: ${branch.name}`,
    });

    res.json(branch);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/branches/:id', auth, tenant, checkPermission('branches.edit'), async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },  // ← ✅
      req.body,
      { new: true }
    );

    if (!branch) return res.status(404).json({ msg: 'الفرع غير موجود' });

    await logAction({
      req,
      action: 'update',
      resource: 'branch',
      resourceId: branch._id,
      description: `تعديل فرع: ${branch.name}`,
    });

    res.json(branch);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/branches/:id', auth, tenant, checkPermission('branches.delete'), async (req, res) => {
  try {
    const branch = await Branch.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId,  // ← ✅
    });

    if (!branch) return res.status(404).json({ msg: 'الفرع غير موجود' });

    await logAction({
      req,
      action: 'delete',
      resource: 'branch',
      resourceId: branch._id,
      description: `حذف فرع: ${branch.name}`,
    });

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/branches/:id/assign-manager', auth, tenant, checkPermission('branches.assign.manager'), async (req, res) => {
  try {
    const { managerId } = req.body;

    // ✅ نتأكد إن الفرع + المستخدم من نفس الشركة
    const branch = await Branch.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });
    if (!branch) return res.status(404).json({ msg: 'الفرع غير موجود' });

    const manager = await User.findOne({
      _id: managerId,
      companyId: req.companyId,
    });
    if (!manager) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    branch.manager = managerId;
    await branch.save();

    manager.companyRole = 'manager';
    manager.role = 'manager';
    manager.branch = req.params.id;
    await manager.save();

    await logAction({
      req,
      action: 'update',
      resource: 'branch',
      resourceId: branch._id,
      description: `تعيين مدير للفرع: ${manager.name}`,
    });

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/branches-stats', auth, tenant, checkPermission('branches.view.all'), async (req, res) => {
  try {
    const filter = await getBranchFilter(req.user, req.companyId);
    const branches = await Branch.find(filter).populate('manager', 'name email');
    const today = new Date(); today.setHours(0,0,0,0);

    const result = await Promise.all(branches.map(async (b) => {
      // ✅ كل الاستعلامات بـ companyId
      const total = await User.countDocuments({
        companyId: req.companyId,
        branch: b._id,
        active: true,
      });

      const present = await Attendance.countDocuments({
        companyId: req.companyId,
        branch: b._id,
        date: { $gte: today },
        checkIn: { $exists: true },
      });

      const late = await Attendance.countDocuments({
        companyId: req.companyId,
        branch: b._id,
        date: { $gte: today },
        status: 'late',
      });

      return { ...b.toObject(), total, present, late, absent: total - present };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== المستخدمون ====================

router.get('/users',
  auth,
  tenant,
  checkPermission('users.view.branch'),
  scopeToBranch(),
  async (req, res) => {
    try {
      const { role, branch, active } = req.query;

      // ✅ نضمن إن المستخدمين من نفس الشركة
      const filter = { companyId: req.companyId };

      if (req.branchFilter && Object.keys(req.branchFilter).length > 0) {
        Object.assign(filter, req.branchFilter);
      }

      if (role) filter.role = role;
      if (branch) filter.branch = branch;
      if (active !== undefined) filter.active = active === 'true';

      const users = await User.find(filter)
        .populate('branch', 'name')
        .populate('createdBy', 'name')
        .select('-password -faceDescriptor');

      res.json(users);
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  }
);

router.get('/users/branch/:branchId', auth, tenant, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const role = req.user.companyRole || req.user.role;

    // ✅ نضمن إن الفرع من نفس الشركة
    const branch = await Branch.findOne({
      _id: req.params.branchId,
      companyId: req.companyId,
    });
    if (!branch) return res.status(404).json({ msg: 'الفرع غير موجود' });

    // manager/hr مش في المنيا → يقدر يشوف فرعه بس
    if (role === 'manager') {
      if (String(req.user.branch) !== req.params.branchId) {
        return res.status(403).json({ msg: 'ممنوع - لست مدير هذا الفرع' });
      }
    }
    if (role === 'hr' && !(await isHQHR(req.user, req.companyId))) {
      if (String(req.user.branch) !== req.params.branchId) {
        return res.status(403).json({ msg: 'ممنوع - لست hr هذا الفرع' });
      }
    }

    const users = await User.find({
      companyId: req.companyId,   // ← ✅
      branch: req.params.branchId,
    }).select('-password -faceDescriptor');

    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/users', auth, tenant, checkPermission('users.create'), async (req, res) => {
  try {
    const { name, email, password, role, branch, phone, department, position } = req.body;
    const userRole = req.user.companyRole || req.user.role;

    // حماية superadmin
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ msg: 'لا يمكنك إنشاء مدير عام' });
    }

    // ✅ فحص حد الموظفين
    const usersCount = await User.countDocuments({ companyId: req.companyId });
    if (req.company && usersCount >= req.company.subscription.maxEmployees) {
      return res.status(403).json({
        msg: `⚠️ وصلت للحد الأقصى (${req.company.subscription.maxEmployees} موظف)`,
        code: 'MAX_EMPLOYEES_REACHED',
      });
    }

    // تحديد الفرع
    let targetBranch = branch;

    if (userRole === 'manager') {
      targetBranch = req.user.branch;
    }
    if (userRole === 'hr') {
      const isHQ = await isHQHR(req.user, req.companyId);
      if (!isHQ) targetBranch = req.user.branch;
    }

    if (!targetBranch) {
      return res.status(400).json({ msg: 'الفرع مطلوب' });
    }

    // ✅ نتأكد إن الفرع من نفس الشركة
    const branchExists = await Branch.findOne({
      _id: targetBranch,
      companyId: req.companyId,
    });
    if (!branchExists) {
      return res.status(404).json({ msg: 'الفرع غير موجود' });
    }

    // ✅ فحص الإيميل
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ msg: 'البريد مستخدم' });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      companyId: req.companyId,   // ← ✅
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: role || 'employee',
      companyRole: role || 'employee',  // ← ✅
      branch: targetBranch,
      phone,
      department,
      position,
      createdBy: req.user.id,
    });

    await logAction({
      req,
      action: 'create',
      resource: 'user',
      resourceId: user._id,
      description: `إنشاء مستخدم: ${name}`,
      details: { email, role },
    });

    res.json({ ...user.toObject(), password: undefined });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/users/:id', auth, tenant, checkPermission('users.edit'), async (req, res) => {
  try {
    const { password, role, ...rest } = req.body;
    const userRole = req.user.companyRole || req.user.role;

    // ✅ نضمن إن المستخدم من نفس الشركة
    const target = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!target) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    // superadmin protection
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ msg: 'ممنوع' });
    }

    // manager/hr في فرع تاني → يعدّلوا موظفي فرعهم بس
    if (userRole === 'manager' || (userRole === 'hr' && !(await isHQHR(req.user, req.companyId)))) {
      if (String(target.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح — الموظف في فرع آخر' });
      }
      if (target.role === 'superadmin') {
        return res.status(403).json({ msg: 'غير مصرح — لا يمكنك تعديل مدير عام' });
      }
    }

    const update = { ...rest };
    if (role) {
      update.role = role;
      update.companyRole = role;  // ← ✅
    }
    if (password) update.password = await bcrypt.hash(password, 10);

    Object.assign(target, update);
    await target.save();

    await logAction({
      req,
      action: 'update',
      resource: 'user',
      resourceId: target._id,
      description: `تعديل مستخدم: ${target.name}`,
    });

    res.json({ ...target.toObject(), password: undefined });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/users/:id', auth, tenant, checkPermission('users.delete'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ msg: 'لا يمكنك حذف نفسك' });
    }

    const userRole = req.user.companyRole || req.user.role;

    // ✅ نضمن إن المستخدم من نفس الشركة
    const target = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!target) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    // hr في فرع تاني → يحذف موظفي فرعه بس
    if (userRole === 'hr' && !(await isHQHR(req.user, req.companyId))) {
      if (String(target.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح — الموظف في فرع آخر' });
      }
      if (['superadmin', 'hr', 'manager'].includes(target.role)) {
        return res.status(403).json({ msg: 'غير مصرح بحذف هذا المستخدم' });
      }
    }

    // manager → يحذف موظفي فرعه بس
    if (userRole === 'manager') {
      if (String(target.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح — الموظف في فرع آخر' });
      }
      if (['superadmin', 'hr', 'manager'].includes(target.role)) {
        return res.status(403).json({ msg: 'غير مصرح بحذف هذا المستخدم' });
      }
    }

    // hr في المنيا → يقدر يحذف اللي عايزه ما عدا superadmin
    if (userRole === 'hr' && await isHQHR(req.user, req.companyId)) {
      if (target.role === 'superadmin') {
        return res.status(403).json({ msg: 'غير مصرح بحذف مدير عام' });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    await logAction({
      req,
      action: 'delete',
      resource: 'user',
      resourceId: target._id,
      description: `حذف مستخدم: ${target.name}`,
      details: { email: target.email },
    });

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/users/:id/role', auth, tenant, checkPermission('users.assign.roles'), async (req, res) => {
  try {
    // ✅ نضمن إن المستخدم من نفس الشركة
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },  // ← ✅
      { role: req.body.role, companyRole: req.body.role },
      { new: true }
    );

    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    await logAction({
      req,
      action: 'update',
      resource: 'user',
      resourceId: user._id,
      description: `تغيير دور المستخدم: ${user.name} → ${req.body.role}`,
    });

    res.json(user);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// ==================== الإعدادات ====================

router.get('/settings', auth, tenant, checkPermission('settings.view'), async (req, res) => {
  try {
    // ✅ إعدادات الشركة الحالية
    let settings = await Settings.findOne({ companyId: req.companyId });  // ← ✅
    if (!settings) settings = await Settings.create({ companyId: req.companyId });
    res.json(settings);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/settings', auth, tenant, checkPermission('settings.edit'), async (req, res) => {
  try {
    let settings = await Settings.findOne({ companyId: req.companyId });  // ← ✅

    if (!settings) {
      settings = await Settings.create({
        companyId: req.companyId,
        ...req.body,
      });
    } else {
      Object.assign(settings, req.body);
      settings.updatedAt = new Date();
      await settings.save();
    }

    await logAction({
      req,
      action: 'settings_change',
      resource: 'settings',
      resourceId: settings._id,
      description: `تعديل إعدادات الشركة`,
      details: { changes: req.body },
    });

    res.json(settings);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// ==================== ملف الموظف الكامل ====================

router.get('/users/:id/profile', auth, tenant, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    })
      .populate('branch', 'name location')
      .populate('managerId', 'name email position')
      .populate('createdBy', 'name')
      .select('-password -faceDescriptor');

    if (!user) {
      return res.status(404).json({ msg: 'الموظف غير موجود' });
    }

    // ✅ التحقق من الصلاحيات
    const allowed = await canAccessUser(user, req.user);
    if (!allowed) {
      return res.status(403).json({ msg: 'غير مصرح لك بعرض هذا الملف' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // ✅ إحصائيات مع companyId
    const attendanceStats = {
      totalDays: await Attendance.countDocuments({
        companyId: req.companyId,
        user: user._id,
      }),
      presentDays: await Attendance.countDocuments({
        companyId: req.companyId,
        user: user._id,
        checkIn: { $exists: true },
      }),
      lateDays: await Attendance.countDocuments({
        companyId: req.companyId,
        user: user._id,
        status: 'late',
      }),
      absentDays: await Attendance.countDocuments({
        companyId: req.companyId,
        user: user._id,
        date: { $gte: startOfMonth },
        checkIn: { $exists: false },
      }),
      thisMonth: await Attendance.countDocuments({
        companyId: req.companyId,
        user: user._id,
        date: { $gte: startOfMonth },
      }),
    };

    const leavesStats = {
      total: await Leave.countDocuments({ companyId: req.companyId, user: user._id }),
      pending: await Leave.countDocuments({ companyId: req.companyId, user: user._id, status: 'pending' }),
      approved: await Leave.countDocuments({ companyId: req.companyId, user: user._id, status: 'approved' }),
      rejected: await Leave.countDocuments({ companyId: req.companyId, user: user._id, status: 'rejected' }),
    };

    const recentAttendance = await Attendance.find({
      companyId: req.companyId,
      user: user._id,
    })
      .sort({ date: -1 })
      .limit(10);

    const recentLeaves = await Leave.find({
      companyId: req.companyId,
      user: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      user,
      stats: { attendance: attendanceStats, leaves: leavesStats },
      recentAttendance,
      recentLeaves,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put('/users/:id/profile', auth, tenant, checkPermission('users.edit'), async (req, res) => {
  try {
    const userRole = req.user.companyRole || req.user.role;

    // ✅ نضمن إن المستخدم من نفس الشركة
    const target = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });
    if (!target) return res.status(404).json({ msg: 'الموظف غير موجود' });

    // manager/hr في فرع تاني → ملفات فرعهم بس
    if (userRole === 'manager' || (userRole === 'hr' && !(await isHQHR(req.user, req.companyId)))) {
      if (String(target.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    const allowedFields = [
      'employeeId', 'salary', 'managerId', 'nationalId', 'birthDate',
      'address', 'emergencyContact', 'contractType', 'contractEndDate',
      'bankAccount', 'socialInsurance', 'qualifications',
    ];

    const update = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    });

    Object.assign(target, update);
    await target.save();

    await logAction({
      req,
      action: 'update',
      resource: 'user',
      resourceId: target._id,
      description: `تعديل ملف الموظف: ${target.name}`,
    });

    res.json({
      msg: 'تم تحديث الملف بنجاح',
      user: { ...target.toObject(), password: undefined, faceDescriptor: undefined },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// جلب الهيكل التنظيمي
router.get('/organization/tree', auth, tenant, async (req, res) => {
  try {
    const branchFilter = await getBranchFilter(req.user, req.companyId);

    const users = await User.find({
      companyId: req.companyId,   // ← ✅
      active: true,
      ...branchFilter,
    })
      .select('name email position department role companyRole branch managerId profileImage')
      .populate('branch', 'name')
      .lean();

    const buildTree = (managerId = null) => {
      return users
        .filter((u) => {
          const uManager = u.managerId ? String(u.managerId) : null;
          return uManager === (managerId ? String(managerId) : null);
        })
        .map((u) => ({
          ...u,
          children: buildTree(u._id),
        }));
    };

    const tree = buildTree(null);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;