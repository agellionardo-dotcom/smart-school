const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

// ============================================
// ✅ Middleware: superadmin / hr / manager
// ============================================
function requireAdmin(req, res, next) {
  const role = req.user?.companyRole || req.user?.role;
  const allowed = ['superadmin', 'company_owner', 'hr', 'manager'];

  if (!allowed.includes(role) && !req.isSuperAdmin) {
    return res.status(403).json({ msg: '⛔ ليس لديك صلاحية للوصول' });
  }
  next();
}

// ============================================
// ✅ GET /api/audit-logs
// ============================================
router.get('/', auth, tenant, requireAdmin, async (req, res) => {
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
    const filter = { companyId: req.companyId };   // ← ✅

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (userId) filter.user = userId;
    if (status) filter.status = status;

    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    if (search) {
      filter.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { endpoint: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 200);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name email role companyRole')
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
// ============================================
router.get('/stats', auth, tenant, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;

    const matchFilter = { companyId: req.companyId };   // ← ✅

    if (from || to) {
      matchFilter.timestamp = {};
      if (from) matchFilter.timestamp.$gte = new Date(from);
      if (to) matchFilter.timestamp.$lte = new Date(to);
    } else {
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
// ============================================
router.get('/:id', auth, tenant, requireAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    })
      .populate('user', 'name email role companyRole branch')
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
// ✅ DELETE /api/audit-logs/:id (superadmin فقط)
// ============================================
router.delete('/:id', auth, tenant, async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin' && !req.isSuperAdmin) {
      return res.status(403).json({ msg: '⛔ superadmin فقط' });
    }

    const log = await AuditLog.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!log) {
      return res.status(404).json({ msg: 'السجل غير موجود' });
    }

    await AuditLog.findByIdAndDelete(req.params.id);
    res.json({ success: true, msg: '✅ تم الحذف' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;