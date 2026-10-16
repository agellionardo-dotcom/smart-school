const router = require('express').Router();
const Announcement = require('../models/Announcement');
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

// ==================== جلب الإعلانات ====================
router.get('/', auth, tenant, async (req, res) => {
  try {
    const { branch, active } = req.query;
    const filter = { companyId: req.companyId };   // ← ✅
    const role = req.user.companyRole || req.user.role;

    if (role === 'superadmin' || req.isSuperAdmin) {
      // كل الإعلانات
    } else if (role === 'hr' && (await isHQHRCheck(req.user, req.companyId))) {
      // كل الإعلانات
    } else if (['hr', 'manager', 'company_owner'].includes(role)) {
      filter.$or = [
        { branch: req.user.branch },
        { branch: null },
      ];
    } else {
      filter.$or = [
        { branch: req.user.branch },
        { branch: null },
      ];
    }

    if (branch) filter.branch = branch;
    if (active !== undefined) filter.active = active === 'true';

    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { expiresAt: null },
        { expiresAt: { $gte: new Date() } },
      ],
    });

    const announcements = await Announcement.find(filter)
      .populate('branch', 'name')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(announcements);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إنشاء إعلان ====================
router.post('/', auth, tenant, checkPermission('users.create'), async (req, res) => {
  try {
    const { title, content, type, branch, expiresAt } = req.body;
    const role = req.user.companyRole || req.user.role;

    if (!title || !content) {
      return res.status(400).json({ msg: 'العنوان والمحتوى مطلوبين' });
    }

    let targetBranch = branch;

    if (role === 'manager') {
      targetBranch = req.user.branch;
    }

    if (role === 'hr' && !(await isHQHRCheck(req.user, req.companyId))) {
      targetBranch = req.user.branch;
    }

    if (targetBranch) {
      const branchExists = await Branch.findOne({
        _id: targetBranch,
        companyId: req.companyId,   // ← ✅
      });
      if (!branchExists) {
        return res.status(400).json({ msg: 'الفرع غير موجود' });
      }
    }

    const announcement = await Announcement.create({
      companyId: req.companyId,   // ← ✅
      title,
      content,
      type: type || 'info',
      branch: targetBranch || null,
      expiresAt: expiresAt || null,
      createdBy: req.user.id,
      active: true,
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('branch', 'name')
      .populate('createdBy', 'name role');

    await logAction({
      req,
      action: 'publish',
      resource: 'announcement',
      resourceId: announcement._id,
      description: `نشر إعلان: ${title}`,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement:new', { announcement: populated });
    }

    res.status(201).json({ msg: '✅ تم إنشاء الإعلان', announcement: populated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تعديل إعلان ====================
router.put('/:id', auth, tenant, checkPermission('users.edit'), async (req, res) => {
  try {
    const role = req.user.companyRole || req.user.role;

    const announcement = await Announcement.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!announcement) {
      return res.status(404).json({ msg: 'الإعلان غير موجود' });
    }

    if (role === 'manager') {
      if (String(announcement.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    if (role === 'hr' && !(await isHQHRCheck(req.user, req.companyId))) {
      if (String(announcement.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    const allowedFields = ['title', 'content', 'type', 'expiresAt', 'active'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        announcement[field] = req.body[field];
      }
    });

    await announcement.save();

    const populated = await Announcement.findById(announcement._id)
      .populate('branch', 'name')
      .populate('createdBy', 'name role');

    res.json({ msg: '✅ تم التحديث', announcement: populated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== حذف إعلان ====================
router.delete('/:id', auth, tenant, checkPermission('users.delete'), async (req, res) => {
  try {
    const role = req.user.companyRole || req.user.role;

    const announcement = await Announcement.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!announcement) {
      return res.status(404).json({ msg: 'الإعلان غير موجود' });
    }

    if (role === 'manager') {
      if (String(announcement.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    await Announcement.findByIdAndDelete(req.params.id);

    await logAction({
      req,
      action: 'delete',
      resource: 'announcement',
      resourceId: announcement._id,
      description: `حذف إعلان: ${announcement.title}`,
    });

    res.json({ ok: true, msg: '✅ تم الحذف' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تعليم الإعلان كمقروء ====================
router.put('/:id/read', auth, tenant, async (req, res) => {
  try {
    const announcement = await Announcement.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!announcement) {
      return res.status(404).json({ msg: 'الإعلان غير موجود' });
    }

    if (!announcement.readBy.includes(req.user.id)) {
      announcement.readBy.push(req.user.id);
      await announcement.save();
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;