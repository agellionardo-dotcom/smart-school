const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

// ============================================
// ✅ Middleware: superadmin / hr فقط
// ============================================
function requireAdmin(req, res, next) {
  const allowed = ['superadmin', 'hr', 'manager'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ msg: '⛔ ليس لديك صلاحية للوصول' });
  }
  next();
}

// ============================================
// ✅ GET /api/audit-logs
// جلب السجلات مع فلترة + pagination
// ============================================
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      user: userId,
      status,
      from,
      to,
      search,
    } = req.query;

    // ===== بناء الفلتر =====
    const filter = {};

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (userId) filter.user = userId;
    if (status) filter.status = status;

    // فلترة بالتاريخ
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    // بحث نصي
    if (search) {
      filter.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { endpoint: { $regex: search, $options: 'i' } },
      ];
    }

    // ===== Pagination =====
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 200); // حد أقصى 200
    const skip = (pageNum - 1) * limitNum;

    // ===== الاستعلام =====
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name email role')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/audit-logs/stats
// إحصائيات سريعة
// ============================================
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;

    const matchFilter = {};
    if (from || to) {
      matchFilter.timestamp = {};
      if (from) matchFilter.timestamp.$gte = new Date(from);
      if (to) matchFilter.timestamp.$lte = new Date(to);
    } else {
      // آخر 7 أيام افتراضيًا
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchFilter.timestamp = { $gte: weekAgo };
    }

    const [byAction, byResource, byStatus, topUsers, total] = await Promise.all([
      AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: { ...matchFilter, user: { $ne: null } } },
        {
          $group: {
            _id: '$user',
            userEmail: { $first: '$userEmail' },
            userName: { $first: '$userName' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.countDocuments(matchFilter),
    ]);

    res.json({
      success: true,
      total,
      byAction,
      byResource,
      byStatus,
      topUsers,
    });
  } catch (err) {
    console.error('Audit stats error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/audit-logs/:id
// جلب سجل واحد بالتفاصيل
// ============================================
router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('user', 'name email role branch')
      .lean();

    if (!log) {
      return res.status(404).json({ msg: 'السجل غير موجود' });
    }

    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ DELETE /api/audit-logs/:id
// حذف سجل (superadmin فقط)
// ============================================
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ msg: '⛔ superadmin فقط' });
    }

    await AuditLog.findByIdAndDelete(req.params.id);
    res.json({ success: true, msg: '✅ تم الحذف' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;