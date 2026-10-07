const router = require('express').Router();
const Emergency = require('../models/Emergency');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { checkPermission, scopeToBranch, isHQHR } = require('../middleware/permissions');

// ==================== Helpers ====================
const getHQBranch = async () => {
  const Branch = require('../models/Branch');
  return await Branch.findOne({ type: 'main' });
};

const isHQHRCheck = async (user) => {
  if (user.role !== 'hr') return false;
  if (!user.branch) return false;
  const hq = await getHQBranch();
  return hq && String(user.branch) === String(hq._id);
};

// ==================== إنشاء حالة طوارئ ====================
router.post('/', auth, async (req, res) => {
  try {
    const { type, message, location } = req.body;

    if (!req.user.branch) {
      return res.status(400).json({ msg: 'ليس لديك فرع محدد' });
    }

    // ✅ نتأكد إن مفيش حالة نشطة بالفعل لنفس المستخدم
    const existing = await Emergency.findOne({
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

    // ✅ إرسال إشعار فوري للمديرين
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');

    if (io) {
      // نجيب كل المديرين + HR + superadmin
      const managers = await User.find({
        role: { $in: ['superadmin', 'manager', 'hr'] },
        active: true,
      }).select('_id');

      // نبعت لكل مدير متصل
      managers.forEach((m) => {
        const socketId = onlineUsers.get(String(m._id));
        if (socketId) {
          io.to(socketId).emit('emergency:new', {
            emergency: populated,
          });
        }
      });

      // كمان نبعت لكل الغرفة (لو فيه room عام)
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
router.get('/', auth, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const { status, branch, limit = 50 } = req.query;

    let filter = {};

    // ✅ superadmin + viewer + HR في المنيا → كل الحالات
    if (['superadmin', 'viewer'].includes(req.user.role)) {
      // كل الحالات
    } else if (req.user.role === 'hr' && await isHQHRCheck(req.user)) {
      // كل الحالات
    } else if (['hr', 'manager'].includes(req.user.role)) {
      // فرعه بس
      filter.branch = req.user.branch;
    } else {
      // الموظف يشوف حالاته بس
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
router.get('/active', auth, async (req, res) => {
  try {
    let filter = { status: 'active' };

    if (['superadmin', 'viewer'].includes(req.user.role)) {
      // كل الحالات
    } else if (req.user.role === 'hr' && await isHQHRCheck(req.user)) {
      // كل الحالات
    } else if (['hr', 'manager'].includes(req.user.role)) {
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
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const { notes } = req.body;

    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) {
      return res.status(404).json({ msg: 'الحالة غير موجودة' });
    }

    // ✅ الصلاحيات: superadmin / HR في المنيا / manager فرعه
    const canResolve =
      req.user.role === 'superadmin' ||
      (req.user.role === 'hr' && await isHQHRCheck(req.user)) ||
      (['hr', 'manager'].includes(req.user.role) &&
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

    // ✅ إشعار فوري
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
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) {
      return res.status(404).json({ msg: 'الحالة غير موجودة' });
    }

    // ✅ صاحب الحالة بس
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