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

module.exports = router;