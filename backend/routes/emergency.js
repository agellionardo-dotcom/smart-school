const router = require('express').Router();
const Emergency = require('../models/Emergency');
const User = require('../models/User');
const Branch = require('../models/Branch');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { checkPermission } = require('../middleware/permissions');
const { logAction } = require('../middleware/auditLog');

// ==================== Helpers ====================
const getHQBranch = async (companyId) => {
  return await Branch.findOne({ companyId, type: 'main' });
};

const isHQHRCheck = async (user, companyId) => {
  const role = user.companyRole || user.role;
  if (role !== 'hr') return false;
  if (!user.branch) return false;
  const hq = await getHQBranch(companyId);
  return hq && String(user.branch) === String(hq._id);
};

// ==================== إنشاء حالة طوارئ ====================
router.post('/', auth, tenant, async (req, res) => {
  try {
    const { type, message, location } = req.body;

    if (!req.user.branch) {
      return res.status(400).json({ msg: 'ليس لديك فرع محدد' });
    }

    // ✅ نفس الشركة
    const existing = await Emergency.findOne({
      companyId: req.companyId,   // ← ✅
      user: req.user.id,
      status: 'active',
    });

    if (existing) {
      return res.status(400).json({
        msg: 'لديك حالة طوارئ نشطة بالفعل',
        emergency: existing,
      });
    }

    const emergency = await Emergency.create({
      companyId: req.companyId,   // ← ✅
      user: req.user.id,
      branch: req.user.branch,
      type: type || 'other',
      message: message || '',
      location: location || {},
      status: 'active',
    });

    const populated = await Emergency.findById(emergency._id)
      .populate('user', 'name email phone position')
      .populate('branch', 'name location');

    await logAction({
      req,
      action: 'create',
      resource: 'emergency',
      resourceId: emergency._id,
      description: `حالة طوارئ: ${type}`,
    });

    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');

    if (io) {
      // ✅ المديرين في نفس الشركة بس
      const managers = await User.find({
        companyId: req.companyId,   // ← ✅
        companyRole: { $in: ['company_owner', 'manager', 'hr'] },
        active: true,
      }).select('_id');

      managers.forEach((m) => {
        const socketId = onlineUsers.get(String(m._id));
        if (socketId) {
          io.to(socketId).emit('emergency:new', { emergency: populated });
        }
      });

      io.emit('emergency:new', { emergency: populated });
    }

    res.status(201).json({
      msg: '✅ تم تسجيل حالة الطوارئ',
      emergency: populated,
    });
  } catch (err) {
    console.error('Emergency POST error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ==================== جلب كل حالات الطوارئ ====================
router.get('/', auth, tenant, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const { status, branch, limit = 50 } = req.query;
    const role = req.user.companyRole || req.user.role;

    let filter = { companyId: req.companyId };   // ← ✅

    if (role === 'superadmin' || req.isSuperAdmin) {
      // كل الحالات
    } else if (role === 'hr' && (await isHQHRCheck(req.user, req.companyId))) {
      // كل الحالات
    } else if (['hr', 'manager', 'company_owner'].includes(role)) {
      filter.branch = req.user.branch;
    } else {
      filter.user = req.user.id;
    }

    if (status) filter.status = status;
    if (branch) filter.branch = branch;

    const emergencies = await Emergency.find(filter)
      .populate('user', 'name email phone position')
      .populate('branch', 'name location')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(emergencies);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== جلب الحالات النشطة ====================
router.get('/active', auth, tenant, async (req, res) => {
  try {
    const role = req.user.companyRole || req.user.role;
    let filter = { companyId: req.companyId, status: 'active' };   // ← ✅

    if (role === 'superadmin' || req.isSuperAdmin) {
      // كل الحالات
    } else if (role === 'hr' && (await isHQHRCheck(req.user, req.companyId))) {
      // كل الحالات
    } else if (['hr', 'manager', 'company_owner'].includes(role)) {
      filter.branch = req.user.branch;
    } else {
      filter.user = req.user.id;
    }

    const emergencies = await Emergency.find(filter)
      .populate('user', 'name email phone position')
      .populate('branch', 'name location')
      .sort({ createdAt: -1 });

    res.json(emergencies);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إغلاق حالة طوارئ ====================
router.put('/:id/resolve', auth, tenant, async (req, res) => {
  try {
    const { notes } = req.body;
    const role = req.user.companyRole || req.user.role;

    const emergency = await Emergency.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!emergency) {
      return res.status(404).json({ msg: 'الحالة غير موجودة' });
    }

    const canResolve =
      role === 'superadmin' ||
      req.isSuperAdmin ||
      (role === 'hr' && (await isHQHRCheck(req.user, req.companyId))) ||
      (['hr', 'manager', 'company_owner'].includes(role) &&
        String(emergency.branch) === String(req.user.branch));

    if (!canResolve) {
      return res.status(403).json({ msg: 'غير مصرح' });
    }

    emergency.status = 'resolved';
    emergency.resolvedBy = req.user.id;
    emergency.resolvedAt = new Date();
    if (notes) emergency.notes = notes;

    await emergency.save();

    const populated = await Emergency.findById(emergency._id)
      .populate('user', 'name email')
      .populate('branch', 'name')
      .populate('resolvedBy', 'name');

    await logAction({
      req,
      action: 'resolve',
      resource: 'emergency',
      resourceId: emergency._id,
      description: `إغلاق حالة طوارئ`,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:resolved', { emergency: populated });
    }

    res.json({ msg: '✅ تم إغلاق الحالة', emergency: populated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إلغاء حالة (من صاحبها) ====================
router.put('/:id/cancel', auth, tenant, async (req, res) => {
  try {
    const emergency = await Emergency.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!emergency) {
      return res.status(404).json({ msg: 'الحالة غير موجودة' });
    }

    if (String(emergency.user) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'غير مصرح' });
    }

    emergency.status = 'cancelled';
    emergency.resolvedAt = new Date();
    await emergency.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:resolved', { emergency });
    }

    res.json({ msg: '✅ تم إلغاء الحالة', emergency });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;