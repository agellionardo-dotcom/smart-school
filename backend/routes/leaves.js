const router = require('express').Router();
const Leave = require('../models/Leave');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { logAction } = require('../middleware/auditLog');

// ============================================
// ✅ 1. إنشاء إجازة جديدة
// ============================================
router.post('/', auth, tenant, async (req, res) => {
  try {
    const { type, startDate, endDate, days, reason, attachments } = req.body;

    // ✅ Validation
    if (!type || !startDate || !endDate) {
      return res.status(400).json({
        msg: 'النوع، تاريخ البداية، وتاريخ النهاية مطلوبين',
      });
    }

    const leave = await Leave.create({
      companyId: req.companyId,   // ← ✅
      user: req.user.id,
      type,
      startDate,
      endDate,
      days: days || 1,
      reason: reason || '',
      attachments: attachments || [],
      status: 'pending',
    });

    // ✅ تسجيل في Audit Log
    await logAction({
      req,
      action: 'create',
      resource: 'leave',
      resourceId: leave._id,
      description: `طلب إجازة جديدة: ${type}`,
      details: { type, startDate, endDate, days },
    });

    res.status(201).json(leave);
  } catch (err) {
    console.error('Create leave error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 2. إجازاتي (الموظف الحالي)
// ============================================
router.get('/my', auth, tenant, async (req, res) => {
  try {
    const leaves = await Leave.find({
      companyId: req.companyId,   // ← ✅
      user: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 3. كل الإجازات (للإدارة)
// ============================================
router.get('/all', auth, tenant, async (req, res) => {
  try {
    // ✅ فحص الصلاحيات (companyRole)
    const role = req.user.companyRole || req.user.role;
    const allowed = ['superadmin', 'company_owner', 'hr', 'manager'];

    if (!allowed.includes(role) && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    // ✅ فلتر
    const filter = { companyId: req.companyId };   // ← ✅

    // فلترة بالحالة
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.user) filter.user = req.query.user;

    const leaves = await Leave.find(filter)
      .populate('user', 'name email position branch')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    console.error('Get all leaves error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 4. موافقة / رفض إجازة
// ============================================
router.put('/:id', auth, tenant, async (req, res) => {
  try {
    // ✅ فحص الصلاحيات
    const role = req.user.companyRole || req.user.role;
    const allowed = ['superadmin', 'company_owner', 'hr', 'manager'];

    if (!allowed.includes(role) && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        msg: 'الحالة يجب أن تكون approved, rejected, أو cancelled',
      });
    }

    // ✅ نضمن إن الإجازة من نفس الشركة
    const leave = await Leave.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!leave) {
      return res.status(404).json({ msg: 'الإجازة غير موجودة' });
    }

    const before = {
      status: leave.status,
      approvedBy: leave.approvedBy,
    };

    leave.status = status;
    leave.approvedBy = req.user.id;
    leave.approvedAt = new Date();

    if (status === 'rejected' && rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }

    await leave.save();

    // ✅ تسجيل في Audit Log
    await logAction({
      req,
      action: status === 'approved' ? 'approve' : 'reject',
      resource: 'leave',
      resourceId: leave._id,
      description: `${status === 'approved' ? 'موافقة' : 'رفض'} على إجازة`,
      changes: {
        before,
        after: { status: leave.status, approvedBy: leave.approvedBy },
      },
    });

    const populated = await Leave.findById(leave._id)
      .populate('user', 'name email position')
      .populate('approvedBy', 'name email');

    res.json(populated);
  } catch (err) {
    console.error('Update leave error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 5. تفاصيل إجازة
// ============================================
router.get('/:id', auth, tenant, async (req, res) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    })
      .populate('user', 'name email position branch')
      .populate('approvedBy', 'name email');

    if (!leave) {
      return res.status(404).json({ msg: 'الإجازة غير موجودة' });
    }

    // ✅ الموظف العادي → بس إجازاته
    const role = req.user.companyRole || req.user.role;
    const isManager = ['superadmin', 'company_owner', 'hr', 'manager'].includes(role);

    if (!isManager && !req.isSuperAdmin && String(leave.user._id) !== String(req.user.id)) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    res.json(leave);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 6. إلغاء إجازة (صاحبها فقط)
// ============================================
router.delete('/:id', auth, tenant, async (req, res) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!leave) {
      return res.status(404).json({ msg: 'الإجازة غير موجودة' });
    }

    // ✅ صاحب الإجازة بس أو الإدارة
    const role = req.user.companyRole || req.user.role;
    const isManager = ['superadmin', 'company_owner', 'hr'].includes(role);
    const isOwner = String(leave.user) === String(req.user.id);

    if (!isOwner && !isManager && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    // لو الإجازة معتمدة → ما ينفعش تتلغي
    if (leave.status === 'approved' && !isManager && !req.isSuperAdmin) {
      return res.status(400).json({ msg: 'لا يمكن إلغاء إجازة معتمدة' });
    }

    leave.status = 'cancelled';
    await leave.save();

    await logAction({
      req,
      action: 'cancel',
      resource: 'leave',
      resourceId: leave._id,
      description: `إلغاء إجازة`,
    });

    res.json({ success: true, msg: '✅ تم إلغاء الإجازة' });
  } catch (err) {
    console.error('Delete leave error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;