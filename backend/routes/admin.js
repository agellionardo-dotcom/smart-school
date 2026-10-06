const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/permissions');

// ==================== الفروع ====================

router.get('/branches', auth, checkPermission('branches.view.all'), async (req, res) => {
  const branches = await Branch.find().populate('manager', 'name email');
  res.json(branches);
});

router.post('/branches', auth, checkPermission('branches.create'), async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    res.json(branch);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/branches/:id', auth, checkPermission('branches.edit'), async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(branch);
});

router.delete('/branches/:id', auth, checkPermission('branches.delete'), async (req, res) => {
  await Branch.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.post('/branches/:id/assign-manager', auth, checkPermission('branches.assign.manager'), async (req, res) => {
  const { managerId } = req.body;
  await Branch.findByIdAndUpdate(req.params.id, { manager: managerId });
  await User.findByIdAndUpdate(managerId, { role: 'manager', branch: req.params.id });
  res.json({ ok: true });
});

router.get('/branches-stats', auth, checkPermission('branches.view.all'), async (req, res) => {
  const branches = await Branch.find().populate('manager', 'name email');
  const today = new Date(); today.setHours(0,0,0,0);
  const result = await Promise.all(branches.map(async (b) => {
    const total = await User.countDocuments({ branch: b._id, role: 'employee' });
    const present = await Attendance.countDocuments({ branch: b._id, date: { $gte: today }, checkIn: { $exists: true } });
    const late = await Attendance.countDocuments({ branch: b._id, date: { $gte: today }, status: 'late' });
    return { ...b.toObject(), total, present, late, absent: total - present };
  }));
  res.json(result);
});

// ==================== المستخدمون ====================

router.get('/users', auth, checkPermission('users.view.all'), async (req, res) => {
  const { role, branch, active } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (branch) filter.branch = branch;
  if (active !== undefined) filter.active = active === 'true';
  const users = await User.find(filter)
    .populate('branch', 'name')
    .populate('createdBy', 'name')
    .select('-password -faceDescriptor');
  res.json(users);
});

router.get('/users/branch/:branchId', auth, checkPermission('users.view.branch'), async (req, res) => {
  if (req.user.role === 'manager' && String(req.user.branch) !== req.params.branchId) {
    return res.status(403).json({ msg: 'ممنوع - لست مدير هذا الفرع' });
  }
  const users = await User.find({ branch: req.params.branchId }).select('-password -faceDescriptor');
  res.json(users);
});

router.post('/users', auth, checkPermission('users.create'), async (req, res) => {
  try {
    const { name, email, password, role, branch, phone, department, position } = req.body;
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ msg: 'لا يمكنك إنشاء مدير عام' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: 'البريد مستخدم' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashed,
      role: role || 'employee',
      branch, phone, department, position,
      createdBy: req.user.id
    });
    res.json({ ...user.toObject(), password: undefined });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/users/:id', auth, checkPermission('users.edit'), async (req, res) => {
  const { password, role, ...rest } = req.body;
  if (role === 'superadmin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ msg: 'ممنوع' });
  }
  const update = { ...rest };
  if (role) update.role = role;
  if (password) update.password = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
  res.json(user);
});

router.delete('/users/:id', auth, checkPermission('users.delete'), async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ msg: 'لا يمكنك حذف نفسك' });
  }
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.put('/users/:id/role', auth, checkPermission('users.assign.roles'), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  res.json(user);
});

// ==================== الإعدادات ====================

router.get('/settings', auth, checkPermission('settings.view'), async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  res.json(settings);
});

router.put('/settings', auth, checkPermission('settings.edit'), async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create(req.body);
  else {
    Object.assign(settings, req.body);
    settings.updatedAt = new Date();
    await settings.save();
  }
  res.json(settings);
});
// ==================== ملف الموظف الكامل ====================

// جلب ملف موظف واحد بكل تفاصيله
router.get('/users/:id/profile', auth, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    const isAdmin = ['superadmin', 'hr', 'manager'].includes(req.user.role);
    const isSelf = req.user.id === req.params.id;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ msg: 'غير مصرح لك بعرض هذا الملف' });
    }

    const user = await User.findById(req.params.id)
      .populate('branch', 'name location')
      .populate('managerId', 'name email position')
      .populate('createdBy', 'name')
      .select('-password -faceDescriptor');

    if (!user) {
      return res.status(404).json({ msg: 'الموظف غير موجود' });
    }

    // إحصائيات الموظف
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const attendanceStats = {
      totalDays: await Attendance.countDocuments({ user: user._id }),
      presentDays: await Attendance.countDocuments({ user: user._id, checkIn: { $exists: true } }),
      lateDays: await Attendance.countDocuments({ user: user._id, status: 'late' }),
      absentDays: await Attendance.countDocuments({ 
        user: user._id, 
        date: { $gte: startOfMonth },
        checkIn: { $exists: false }
      }),
      thisMonth: await Attendance.countDocuments({ 
        user: user._id, 
        date: { $gte: startOfMonth } 
      })
    };

    const leavesStats = {
      total: await Leave.countDocuments({ user: user._id }),
      pending: await Leave.countDocuments({ user: user._id, status: 'pending' }),
      approved: await Leave.countDocuments({ user: user._id, status: 'approved' }),
      rejected: await Leave.countDocuments({ user: user._id, status: 'rejected' })
    };

    // آخر 10 سجلات حضور
    const recentAttendance = await Attendance.find({ user: user._id })
      .sort({ date: -1 })
      .limit(10);

    // آخر 5 إجازات
    const recentLeaves = await Leave.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      user,
      stats: {
        attendance: attendanceStats,
        leaves: leavesStats
      },
      recentAttendance,
      recentLeaves
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// تحديث ملف الموظف (البيانات الإضافية)
router.put('/users/:id/profile', auth, checkPermission('users.edit'), async (req, res) => {
  try {
    const allowedFields = [
      'employeeId', 'salary', 'managerId', 'nationalId', 'birthDate',
      'address', 'emergencyContact', 'contractType', 'contractEndDate',
      'bankAccount', 'socialInsurance', 'qualifications'
    ];

    const update = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).select('-password -faceDescriptor');

    if (!user) {
      return res.status(404).json({ msg: 'الموظف غير موجود' });
    }

    res.json({ msg: 'تم تحديث الملف بنجاح', user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// جلب الهيكل التنظيمي (شجرة الموظفين)
router.get('/organization/tree', auth, async (req, res) => {
  try {
    const users = await User.find({ active: true })
      .select('name email position department role branch managerId profileImage')
      .populate('branch', 'name')
      .lean();

    // بناء الشجرة
    const buildTree = (managerId = null) => {
      return users
        .filter(u => {
          const uManager = u.managerId ? String(u.managerId) : null;
          return uManager === (managerId ? String(managerId) : null);
        })
        .map(u => ({
          ...u,
          children: buildTree(u._id)
        }));
    };

    const tree = buildTree(null);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});
module.exports = router;