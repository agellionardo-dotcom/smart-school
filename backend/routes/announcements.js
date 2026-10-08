const router = require('express').Router();
const Announcement = require('../models/Announcement');
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

// ==================== جلب الإعلانات ====================
router.get('/', auth, async (req, res) => {
  try {
    const { branch, active } = req.query;
    const filter = {};

    // ✅ الفلترة حسب الدور
    if (req.user.role === 'superadmin') {
      // كل الإعلانات
    } else if (req.user.role === 'hr' && await isHQHRCheck(req.user)) {
      // كل الإعلانات
    } else if (['hr', 'manager'].includes(req.user.role)) {
      // إعلانات فرعه + الإعلانات العامة
      filter.$or = [
        { branch: req.user.branch },
        { branch: null },
      ];
    } else {
      // الموظف: إعلانات فرعه + الإعلانات العامة
      filter.$or = [
        { branch: req.user.branch },
        { branch: null },
      ];
    }

    // ✅ فلترة إضافية
    if (branch) filter.branch = branch;
    if (active !== undefined) filter.active = active === 'true';

    // ✅ نتجاهل الإعلانات المنتهية
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
router.post('/', auth, checkPermission('users.create'), async (req, res) => {
  try {
    const { title, content, type, branch, expiresAt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ msg: 'العنوان والمحتوى مطلوبين' });
    }

    let targetBranch = branch;

    // ✅ manager → فرعه بس (إجباري)
    if (req.user.role === 'manager') {
      targetBranch = req.user.branch;
    }

    // ✅ hr في فرع تاني → فرعه بس
    if (req.user.role === 'hr' && !(await isHQHRCheck(req.user))) {
      targetBranch = req.user.branch;
    }

    // ✅ superadmin + HR في المنيا → كل الفروع (branch = null) أو فرع محدد
    // (لو مش محدد، يبقى null = كل الفروع)

    // ✅ validation للفرع
    if (targetBranch) {
      const branchExists = await Branch.findById(targetBranch);
      if (!branchExists) {
        return res.status(400).json({ msg: 'الفرع غير موجود' });
      }
    }

    const announcement = await Announcement.create({
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

    // ✅ إشعار فوري للموظفين
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
router.put('/:id', auth, checkPermission('users.edit'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ msg: 'الإعلان غير موجود' });
    }

    // ✅ manager → إعلانات فرعه بس
    if (req.user.role === 'manager') {
      if (String(announcement.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    // ✅ hr في فرع تاني → إعلانات فرعه بس
    if (req.user.role === 'hr' && !(await isHQHRCheck(req.user))) {
      if (String(announcement.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    const allowedFields = ['title', 'content', 'type', 'expiresAt', 'active'];
    allowedFields.forEach(field => {
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
router.delete('/:id', auth, checkPermission('users.delete'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ msg: 'الإعلان غير موجود' });
    }

    // ✅ manager → إعلانات فرعه بس
    if (req.user.role === 'manager') {
      if (String(announcement.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ ok: true, msg: '✅ تم الحذف' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تعليم الإعلان كمقروء ====================
router.put('/:id/read', auth, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
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