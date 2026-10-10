const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { upload, cloudinary, ALLOWED_TYPES } = require('../middleware/upload');

// ============================================
// ✅ 1. رفع مستند جديد
// POST /api/documents
// ============================================
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'الملف مطلوب' });
    }

    const { userId, type, title, issueDate, expiryDate, notes } = req.body;

    if (!userId || !type || !title) {
      // امسح الملف المرفوع
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(400).json({ msg: 'الموظف والنوع والاسم مطلوبين' });
    }

    // ✅ تحقق من الموظف
    const user = await User.findById(userId);
    if (!user) {
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(404).json({ msg: 'الموظف غير موجود' });
    }

    // ✅ أنشئ المستند
    const doc = await Document.create({
      user: userId,
      type,
      title: title.trim(),
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.format || req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname,
      },
      issueDate: issueDate ? new Date(issueDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes: notes ? notes.trim() : '',
      uploadedBy: req.user.id,
    });

    const populated = await Document.findById(doc._id)
      .populate('user', 'name email')
      .populate('uploadedBy', 'name');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Upload document error:', err);
    // امسح الملف في حالة الخطأ
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 2. جلب مستندات موظف
// GET /api/documents/user/:userId
// ============================================
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // ✅ التحقق من الصلاحيات
    if (
      req.user.role === 'employee' &&
      String(req.user.id) !== String(userId)
    ) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    const docs = await Document.find({
      user: userId,
      archived: false,
    })
      .populate('uploadedBy', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(docs);
  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 3. جلب مستند واحد
// GET /api/documents/:id
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('uploadedBy', 'name')
      .populate('reviewedBy', 'name');

    if (!doc) {
      return res.status(404).json({ msg: 'المستند غير موجود' });
    }

    // ✅ التحقق من الصلاحيات
    if (
      req.user.role === 'employee' &&
      String(req.user.id) !== String(doc.user._id)
    ) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 4. تعديل مستند (بدون الملف)
// PUT /api/documents/:id
// ============================================
router.put('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'المستند غير موجود' });

    const { title, type, issueDate, expiryDate, notes, status } = req.body;

    if (title) doc.title = title.trim();
    if (type) doc.type = type;
    if (issueDate !== undefined) doc.issueDate = issueDate ? new Date(issueDate) : null;
    if (expiryDate !== undefined) doc.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (notes !== undefined) doc.notes = notes ? notes.trim() : '';

    // ✅ فقط HR/manager يقدر يغير الحالة
    if (status && ['hr', 'manager', 'superadmin'].includes(req.user.role)) {
      doc.status = status;
      doc.reviewedBy = req.user.id;
      doc.reviewedAt = new Date();
    }

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 5. حذف مستند
// DELETE /api/documents/:id
// ============================================
router.delete('/:id', auth, async (req, res) => {
  try {
    // ✅ فقط HR/manager/superadmin
    if (!['hr', 'manager', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'المستند غير موجود' });

    // ✅ امسح من Cloudinary
    if (doc.file && doc.file.publicId) {
      try {
        await cloudinary.uploader.destroy(doc.file.publicId, {
          resource_type: doc.file.format === 'pdf' ? 'raw' : 'image',
        });
      } catch (e) {
        console.error('Cloudinary delete error:', e);
      }
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ msg: '✅ تم حذف المستند' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 6. الموافقة / الرفض
// PUT /api/documents/:id/review
// ============================================
router.put('/:id/review', auth, async (req, res) => {
  try {
    if (!['hr', 'manager', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    const { status, notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'الحالة غير صحيحة' });
    }

    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        status,
        notes: notes || '',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!doc) return res.status(404).json({ msg: 'المستند غير موجود' });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 7. إحصائيات مستندات موظف
// GET /api/documents/user/:userId/stats
// ============================================
router.get('/user/:userId/stats', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const docs = await Document.find({ user: userId, archived: false });

    const stats = {
      total: docs.length,
      approved: docs.filter((d) => d.status === 'approved').length,
      pending: docs.filter((d) => d.status === 'pending').length,
      rejected: docs.filter((d) => d.status === 'rejected').length,
      expired: docs.filter((d) => d.expiryDate && new Date(d.expiryDate) < new Date()).length,
      expiringSoon: docs.filter((d) => {
        if (!d.expiryDate) return false;
        const days = Math.ceil((new Date(d.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 30;
      }).length,
    };

    // ✅ المستندات الناقصة
    const requiredTypes = ['national_id', 'birth_certificate', 'contract'];
    const userDocTypes = docs.map((d) => d.type);
    stats.missing = requiredTypes.filter((t) => !userDocTypes.includes(t));

    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 8. جلب أنواع المستندات المتاحة
// GET /api/documents/types
// ============================================
router.get('/types/list', auth, async (req, res) => {
  try {
    const types = Object.entries(ALLOWED_TYPES).map(([key, label]) => ({
      value: key,
      label,
    }));
    res.json(types);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 9. المستندات المنتهية أو القريبة من الانتهاء
// GET /api/documents/alerts/expiring
// ============================================
router.get('/alerts/expiring', auth, async (req, res) => {
  try {
    if (!['hr', 'manager', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const docs = await Document.find({
      archived: false,
      expiryDate: { $lte: in30Days },
    })
      .populate('user', 'name email branch')
      .sort({ expiryDate: 1 });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;