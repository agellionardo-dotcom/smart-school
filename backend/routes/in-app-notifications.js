// 📁 backend/routes/in-app-notifications.js
// ⬅️ ملف جديد (إشعارات داخل التطبيق)

const router = require('express').Router();
const Notification = require('../models/Notification'); // ← الموديل الجديد
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

// ✅ جلب إشعارات المستخدم
router.get('/', auth, tenant, async (req, res) => {
  try {
    const notifications = await Notification.find({
      companyId: req.companyId,
      user: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ✅ عدد الإشعارات غير المقروءة
router.get('/unread-count', auth, tenant, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      companyId: req.companyId,
      user: req.user.id,
      read: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ✅ تعليم إشعار كمقروء
router.put('/:id/read', auth, tenant, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ✅ تعليم الكل كمقروء
router.put('/read-all', auth, tenant, async (req, res) => {
  try {
    await Notification.updateMany(
      { companyId: req.companyId, user: req.user.id, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;