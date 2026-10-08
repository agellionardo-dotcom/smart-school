const router = require('express').Router();
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Branch = require('../models/Branch');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// ==================== Helpers ====================
const getHQBranch = async () => {
  return await Branch.findOne({ type: 'main' });
};

const isHQHRCheck = async (user) => {
  if (user.role !== 'hr') return false;
  if (!user.branch) return false;
  const hq = await getHQBranch();
  return hq && String(user.branch) === String(hq._id);
};

// ✅ الفلتر حسب الدور
const getFilter = async (user, query = {}) => {
  const filter = {};

  // superadmin + viewer → كل الفروع
  if (['superadmin', 'viewer'].includes(user.role)) {
    // كل حاجة
  } else if (user.role === 'hr' && await isHQHRCheck(user)) {
    // كل حاجة
  } else if (['hr', 'manager'].includes(user.role)) {
    // فرعه بس
    filter.branch = user.branch;
  } else {
    // الموظف يشوف راتبه بس
    filter.user = user.id;
  }

  // فلترة إضافية من الـ query
  if (query.month) filter.month = parseInt(query.month);
  if (query.year) filter.year = parseInt(query.year);
  if (query.status) filter.status = query.status;
  if (query.branch) filter.branch = query.branch;
  if (query.user) filter.user = query.user;

  return filter;
};

// ==================== جلب الرواتب ====================
router.get('/', auth, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const filter = await getFilter(req.user, req.query);

    const payrolls = await Payroll.find(filter)
      .populate('user', 'name email position department employeeId')
      .populate('branch', 'name')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .limit(500);

    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== جلب رواتب موظف ====================
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // الموظف يقدر يشوف راتبه بس
    if (req.user.role === 'employee' && String(req.user.id) !== req.params.userId) {
      return res.status(403).json({ msg: 'غير مصرح' });
    }

    const payrolls = await Payroll.find({ user: req.params.userId })
      .populate('branch', 'name')
      .sort({ year: -1, month: -1 });

    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إحصائيات ====================
router.get('/stats/:year/:month', auth, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const { year, month } = req.params;
    const filter = await getFilter(req.user, { year, month });

    const payrolls = await Payroll.find(filter);

    const stats = {
      totalEmployees: payrolls.length,
      totalBasic: payrolls.reduce((sum, p) => sum + (p.basicSalary || 0), 0),
      totalAllowances: payrolls.reduce((sum, p) => sum + (p.totalAllowances || 0), 0),
      totalBonuses: payrolls.reduce((sum, p) => sum + (p.totalBonuses || 0), 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0),
      totalNet: payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0),
      paid: payrolls.filter(p => p.status === 'paid').length,
      approved: payrolls.filter(p => p.status === 'approved').length,
      draft: payrolls.filter(p => p.status === 'draft').length,
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إنشاء راتب ====================
router.post('/', auth, checkPermission('users.edit'), async (req, res) => {
  try {
    const {
      user: userId,
      month,
      year,
      basicSalary,
      allowances,
      bonuses,
      deductions,
      notes,
    } = req.body;

    if (!userId || !month || !year) {
      return res.status(400).json({ msg: 'الموظف والشهر والسنة مطلوبين' });
    }

    // ✅ نتأكد إن الموظف موجود
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ msg: 'الموظف غير موجود' });
    }

    // ✅ manager/hr في فرع تاني → موظفي فرعهم بس
    if (req.user.role === 'manager' || (req.user.role === 'hr' && !(await isHQHRCheck(req.user)))) {
      if (String(targetUser.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح — الموظف في فرع آخر' });
      }
    }

    // ✅ نتأكد إن مفيش راتب لنفس الموظف في نفس الشهر
    const existing = await Payroll.findOne({ user: userId, month, year });
    if (existing) {
      return res.status(400).json({ msg: 'يوجد راتب لهذا الموظف في هذا الشهر بالفعل' });
    }

    const payroll = await Payroll.create({
      user: userId,
      branch: targetUser.branch,
      month,
      year,
      basicSalary: basicSalary || 0,
      allowances: allowances || {},
      bonuses: bonuses || {},
      deductions: deductions || {},
      notes: notes || '',
      status: 'draft',
      createdBy: req.user.id,
    });

    const populated = await Payroll.findById(payroll._id)
      .populate('user', 'name email position')
      .populate('branch', 'name');

    res.status(201).json({ msg: '✅ تم إنشاء الراتب', payroll: populated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تعديل راتب ====================
router.put('/:id', auth, checkPermission('users.edit'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ msg: 'الراتب غير موجود' });
    }

    // ✅ manager/hr في فرع تاني → فرعهم بس
    if (req.user.role === 'manager' || (req.user.role === 'hr' && !(await isHQHRCheck(req.user)))) {
      if (String(payroll.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    // ✅ ممنوع تعديل راتب مدفوع
    if (payroll.status === 'paid') {
      return res.status(400).json({ msg: 'لا يمكن تعديل راتب مدفوع' });
    }

    const allowedFields = ['basicSalary', 'allowances', 'bonuses', 'deductions', 'notes'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        payroll[field] = req.body[field];
      }
    });

    await payroll.save();

    const populated = await Payroll.findById(payroll._id)
      .populate('user', 'name email position')
      .populate('branch', 'name');

    res.json({ msg: '✅ تم تحديث الراتب', payroll: populated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== اعتماد راتب ====================
router.put('/:id/approve', auth, checkPermission('users.edit'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ msg: 'الراتب غير موجود' });
    }

    if (payroll.status !== 'draft') {
      return res.status(400).json({ msg: 'الراتب تم اعتماده أو دفعه بالفعل' });
    }

    payroll.status = 'approved';
    payroll.approvedBy = req.user.id;
    payroll.approvedAt = new Date();
    await payroll.save();

    res.json({ msg: '✅ تم اعتماد الراتب', payroll });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== دفع راتب ====================
router.put('/:id/pay', auth, checkPermission('users.edit'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ msg: 'الراتب غير موجود' });
    }

    if (payroll.status !== 'approved') {
      return res.status(400).json({ msg: 'لازم تعتمد الراتب الأول' });
    }

    payroll.status = 'paid';
    payroll.paidAt = new Date();
    await payroll.save();

    res.json({ msg: '✅ تم تسجيل دفع الراتب', payroll });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== حذف راتب ====================
router.delete('/:id', auth, checkPermission('users.delete'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ msg: 'الراتب غير موجود' });
    }

    // ✅ ممنوع حذف راتب مدفوع
    if (payroll.status === 'paid') {
      return res.status(400).json({ msg: 'لا يمكن حذف راتب مدفوع' });
    }

    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ ok: true, msg: '✅ تم حذف الراتب' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إنشاء رواتب جماعية ====================
router.post('/bulk', auth, checkPermission('users.edit'), async (req, res) => {
  try {
    const { month, year, branch, basicSalaryDefault } = req.body;

    if (!month || !year) {
      return res.status(400).json({ msg: 'الشهر والسنة مطلوبين' });
    }

    // ✅ نحدد الفلتر حسب الدور
    let userFilter = { active: true, role: { $ne: 'superadmin' } };

    if (req.user.role === 'manager' || (req.user.role === 'hr' && !(await isHQHRCheck(req.user)))) {
      userFilter.branch = req.user.branch;
    } else if (branch) {
      userFilter.branch = branch;
    }

    const users = await User.find(userFilter);

    const results = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (const user of users) {
      try {
        const existing = await Payroll.findOne({ user: user._id, month, year });
        if (existing) {
          results.skipped++;
          continue;
        }

        await Payroll.create({
          user: user._id,
          branch: user.branch,
          month,
          year,
          basicSalary: user.salary || basicSalaryDefault || 0,
          status: 'draft',
          createdBy: req.user.id,
        });

        results.created++;
      } catch (err) {
        results.errors.push(`${user.name}: ${err.message}`);
      }
    }

    res.json({
      msg: `✅ تم إنشاء ${results.created} راتب · تم تخطي ${results.skipped}`,
      results,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;