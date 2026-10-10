const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const {
  getFaceDescriptor,
  compareFaces,
  dataURLToBuffer,
  loadModels,
} = require('../services/faceService');

// ============================================
// ✅ 1. تسجيل الوجه (Enroll)
// POST /api/face/enroll
// ============================================
router.post('/enroll', auth, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ msg: 'الصورة مطلوبة' });
    }

    // ✅ استخراج الـ descriptor
    const imageBuffer = dataURLToBuffer(image);
    const result = await getFaceDescriptor(imageBuffer);

    if (!result.success) {
      return res.status(400).json({ msg: result.error });
    }

    // ✅ حفظ في قاعدة البيانات
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    user.faceDescriptor = result.descriptor;
    user.faceEnrolled = true;
    user.faceEnrolledAt = new Date();
    await user.save();

    res.json({
      success: true,
      msg: '✅ تم تسجيل الوجه بنجاح',
      faceEnrolled: true,
    });
  } catch (err) {
    console.error('Face enroll error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 2. التحقق من الوجه (Verify)
// POST /api/face/verify
// ============================================
router.post('/verify', auth, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ msg: 'الصورة مطلوبة' });
    }

    // ✅ جلب المستخدم + descriptor
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    if (!user.faceDescriptor || user.faceDescriptor.length === 0) {
      return res.status(400).json({
        msg: 'الوجه غير مسجّل — سجّل وجهك أولاً',
        faceEnrolled: false,
      });
    }

    // ✅ استخراج descriptor من الصورة الجديدة
    const imageBuffer = dataURLToBuffer(image);
    const result = await getFaceDescriptor(imageBuffer);

    if (!result.success) {
      return res.status(400).json({ msg: result.error });
    }

    // ✅ مقارنة الوجهين
    const comparison = compareFaces(user.faceDescriptor, result.descriptor);

    if (comparison.match) {
      res.json({
        success: true,
        verified: true,
        confidence: Math.round(comparison.confidence * 100),
        msg: '✅ تم التحقق من الوجه',
      });
    } else {
      res.status(401).json({
        success: false,
        verified: false,
        confidence: Math.round(comparison.confidence * 100),
        msg: '❌ الوجه لا يطابق السجل',
      });
    }
  } catch (err) {
    console.error('Face verify error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 3. حالة تسجيل الوجه
// GET /api/face/status
// ============================================
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    res.json({
      faceEnrolled: user.faceEnrolled || false,
      faceEnrolledAt: user.faceEnrolledAt || null,
      hasDescriptor: !!(user.faceDescriptor && user.faceDescriptor.length > 0),
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 4. حذف الوجه
// DELETE /api/face/remove
// ============================================
router.delete('/remove', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    user.faceDescriptor = [];
    user.faceEnrolled = false;
    user.faceEnrolledAt = null;
    await user.save();

    res.json({
      success: true,
      msg: '✅ تم حذف تسجيل الوجه',
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;