// 📁 backend/routes/leaves.js
// ⬅️ استبدل الملف بالكامل

const router = require('express').Router();
const Leave = require('../models/Leave');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { logAction } = require('../middleware/auditLog');

// ============================================
// ✅ 1. إنشاء إجازة جديدة (مع الإشعارات)
// ============================================
router.post('/', auth, tenant, async (req, res) => {
  try {
    const { type, startDate, endDate, days, reason, attachments } = req.body;

    if (!type || !startDate || !endDate) {
      return res.status(400).json({
        msg: 'النوع، تاريخ البداية، وتاريخ النهاية مطلوبين',
      });
    }

    const leave = await Leave.create({
      companyId: req.companyId,
      user: req.user.id,
      type,
      startDate,
      endDate,
      days: days || 1,
      reason: reason || '',
      attachments: attachments || [],
      status: 'pending',
    });

    // ✅ إرسال إشعارات
    try {
      const employee = await User.findById(req.user.id).populate('branch');

      const notifyUsers = [];

      // 1. الـ HR بتاع فرع الموظف
      if (employee.branch?._id) {
        const branchHR = await User.findOne({
          companyId: req.companyId,
          branch: employee.branch._id,
          companyRole: 'hr',
        });
        if (branchHR && String(branchHR._id) !== String(req.user.id)) {
          notifyUsers.push(branchHR._id);
        }
      }

      // 2. الـ HR بتاع الفرع الرئيسي
      const hq = await Branch.findOne({
        companyId: req.companyId,
        type: 'main',
      });
      if (hq) {
        const hqHR = await User.findOne({
          companyId: req.companyId,
          branch: hq._id,
          companyRole: 'hr',
        });
        if (hqHR && String(hqHR._id) !== String(req.user.id)) {
          notifyUsers.push(hqHR._id);
        }
      }

      // 3. Company Owner
      const owner = await User.findOne({
        companyId: req.companyId,
        companyRole: 'company_owner',
      });
      if (owner && String(owner._id) !== String(req.user.id)) {
        notifyUsers.push(owner._id);
      }

      // ✅ إنشاء الإشعارات
      for (const userId of notifyUsers) {
        await Notification.create({
          companyId: req.companyId,
          user: userId,
          type: 'leave_request',
          title: 'طلب إجازة جديد',
          message: `${employee.name} طلب إجازة (${type})`,
          data: { leaveId: leave._id, employeeId: employee._id },
          read: false,
        });
      }

      // ✅ Socket.io (لو متاح)
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');
      if (io && onlineUsers) {
        notifyUsers.forEach((uid) => {
          const socketId = onlineUsers.get(String(uid));
          if (socketId) {
            io.to(socketId).emit('notification', {
              title: 'طلب إجازة جديد',
              message: `${employee.name} طلب إجازة`,
              data: { leaveId: leave._id },
            });
          }
        });
      }
    } catch (notifyErr) {
      console.error('Notify error:', notifyErr.message);
    }

    // ✅ Audit Log
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
      companyId: req.companyId,
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
    const role = req.user.companyRole || req.user.role;
    const allowed = ['superadmin', 'company_owner', 'hr', 'manager'];

    if (!allowed.includes(role) && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

    const filter = { companyId: req.companyId };

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
// ✅ 4. موافقة / رفض إجازة (مع إشعار للموظف)
// ============================================
router.put('/:id', auth, tenant, async (req, res) => {
  try {
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

    const leave = await Leave.findOne({
      _id: req.params.id,
      companyId: req.companyId,
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

    // ✅ إشعار للموظف
    if (['approved', 'rejected'].includes(status)) {
      try {
        await Notification.create({
          companyId: req.companyId,
          user: leave.user,
          type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
          title: status === 'approved' ? '✅ تمت الموافقة على إجازتك' : '❌ تم رفض إجازتك',
          message: status === 'approved'
            ? 'تمت الموافقة على طلب إجازتك'
            : `تم رفض إجازتك${rejectionReason ? `: ${rejectionReason}` : ''}`,
          data: { leaveId: leave._id },
          read: false,
        });
      } catch (notifyErr) {
        console.error('Notify error:', notifyErr.message);
      }
    }

    // ✅ Audit Log
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
      companyId: req.companyId,
    })
      .populate('user', 'name email position branch')
      .populate('approvedBy', 'name email');

    if (!leave) {
      return res.status(404).json({ msg: 'الإجازة غير موجودة' });
    }

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
// ✅ 6. إلغاء إجازة
// ============================================
router.delete('/:id', auth, tenant, async (req, res) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!leave) {
      return res.status(404).json({ msg: 'الإجازة غير موجودة' });
    }

    const role = req.user.companyRole || req.user.role;
    const isManager = ['superadmin', 'company_owner', 'hr'].includes(role);
    const isOwner = String(leave.user) === String(req.user.id);

    if (!isOwner && !isManager && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ ليس لديك صلاحية' });
    }

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