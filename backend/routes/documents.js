const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { upload, cloudinary, ALLOWED_TYPES } = require('../middleware/upload');
const { logAction } = require('../middleware/auditLog');

// ============================================
// ✅ 1. رفع مستند جديد
// ============================================
router.post('/', auth, tenant, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'الملف مطلوب' });
    }

    const { userId, type, title, issueDate, expiryDate, notes } = req.body;

    if (!userId || !type || !title) {
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(400).json({ msg: 'الموظف والنوع والاسم مطلوبين' });
    }

    // ✅ الموظف من نفس الشركة
    const user = await User.findOne({
      _id: userId,
      companyId: req.companyId,   // ← ✅
    });

    if (!user) {
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(404).json({ msg: 'الموظف غير موجود' });
    }

    const doc = await Document.create({
      companyId: req.companyId,   // ← ✅
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

    await logAction({
      req,
      action: 'create',
      resource: 'document',
      resourceId: doc._id,
      description: `رفع مستند: ${title}`,
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error('Upload document error:', err);
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
// ============================================
router.get('/user/:userId', auth, tenant, async (req, res) => {
  try {
    const { userId } = req.params;
    const role = req.user.companyRole || req.user.role;

    if (role === 'employee' && String(req.user.id) !== String(userId)) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    const docs = await Document.find({
      companyId: req.companyId,   // ← ✅
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
// ============================================
router.get('/:id', auth, tenant, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    })
      .populate('user', 'name email phone')
      .populate('uploadedBy', 'name')
      .populate('reviewedBy', 'name');

    if (!doc) {
      return res.status(404).json({ msg: 'المستند غير موجود' });
    }

    const role = req.user.companyRole || req.user.role;
    if (role === 'employee' && String(req.user.id) !== String(doc.user._id)) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 4. تعديل مستند
// ============================================
router.put('/:id', auth, tenant, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!doc) return res.status(404).json({ msg: 'المستند غير موجود' });

    const { title, type, issueDate, expiryDate, notes, status } = req.body;
    const role = req.user.companyRole || req.user.role;

    if (title) doc.title = title.trim();
    if (type) doc.type = type;
    if (issueDate !== undefined) doc.issueDate = issueDate ? new Date(issueDate) : null;
    if (expiryDate !== undefined) doc.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (notes !== undefined) doc.notes = notes ? notes.trim() : '';

    if (status && ['hr', 'manager', 'company_owner', 'superadmin'].includes(role)) {
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
// ============================================
router.delete('/:id', auth, tenant, async (req, res) => {
  try {
    const role = req.user.companyRole || req.user.role;

    if (!['hr', 'manager', 'company_owner', 'superadmin'].includes(role)) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    const doc = await Document.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!doc) return res.status(404).json({ msg: 'المستند غير موجود' });

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

    await logAction({
      req,
      action: 'delete',
      resource: 'document',
      resourceId: doc._id,
      description: `حذف مستند: ${doc.title}`,
    });

    res.json({ msg: '✅ تم حذف المستند' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 6. الموافقة / الرفض
// ============================================
router.put('/:id/review', auth, tenant, async (req, res) => {
  try {
    const role = req.user.companyRole || req.user.role;

    if (!['hr', 'manager', 'company_owner', 'superadmin'].includes(role)) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    const { status, notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'الحالة غير صحيحة' });
    }

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      {
        status,
        notes: notes || '',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!doc) return res.status(404).json({ msg: 'المستند غير موجود' });

    await logAction({
      req,
      action: status === 'approved' ? 'approve' : 'reject',
      resource: 'document',
      resourceId: doc._id,
      description: `${status === 'approved' ? 'موافقة' : 'رفض'} على مستند`,
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 7. إحصائيات مستندات موظف
// ============================================
router.get('/user/:userId/stats', auth, tenant, async (req, res) => {
  try {
    const { userId } = req.params;

    const docs = await Document.find({
      companyId: req.companyId,   // ← ✅
      user: userId,
      archived: false,
    });

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

    const requiredTypes = ['national_id', 'birth_certificate', 'contract'];
    const userDocTypes = docs.map((d) => d.type);
    stats.missing = requiredTypes.filter((t) => !userDocTypes.includes(t));

    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 8. أنواع المستندات
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
// ✅ 9. المستندات المنتهية
// ============================================
router.get('/alerts/expiring', auth, tenant, async (req, res) => {
  try {
    const role = req.user.companyRole || req.user.role;

    if (!['hr', 'manager', 'company_owner', 'superadmin'].includes(role)) {
      return res.status(403).json({ msg: 'ليس لديك صلاحية' });
    }

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const docs = await Document.find({
      companyId: req.companyId,   // ← ✅
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