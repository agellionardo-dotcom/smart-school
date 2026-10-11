// backend/routes/face.js

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
// يقبل: image (base64) أو faceDescriptor (128 رقم)
// ============================================
router.post('/enroll', auth, async (req, res) => {
  try {
    const { image, faceDescriptor } = req.body;

    let descriptor = null;

    // ✅ الحالة 1: descriptor جاهز من التطبيق
    if (faceDescriptor && Array.isArray(faceDescriptor)) {
      if (faceDescriptor.length !== 128) {
        return res.status(400).json({
          msg: `descriptor غير صحيح — لازم 128 رقم، إنت بعت ${faceDescriptor.length}`,
        });
      }
      descriptor = faceDescriptor;
      console.log('[Face Enroll] Using descriptor from client (128 values)');
    }
    // ✅ الحالة 2: صورة base64 (من المتصفح)
    else if (image) {
      console.log('[Face Enroll] Processing image on server...');
      const imageBuffer = dataURLToBuffer(image);
      const result = await getFaceDescriptor(imageBuffer);

      if (!result.success) {
        return res.status(400).json({ msg: result.error });
      }
      descriptor = result.descriptor;
    }
    // ❌ لا image ولا faceDescriptor
    else {
      return res.status(400).json({
        msg: 'مطلوب صورة (image) أو faceDescriptor',
      });
    }

    // ✅ حفظ في المستخدم
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    user.faceDescriptor = descriptor;
    user.faceEnrolled = true;
    user.faceEnrolledAt = new Date();
    await user.save();

    console.log('[Face Enroll] ✅ Saved for user:', user._id);

    res.json({
      success: true,
      msg: 'تم تسجيل الوجه بنجاح',
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
// يقبل: image (base64) أو faceDescriptor (128 رقم)
// ============================================
router.post('/verify', auth, async (req, res) => {
  try {
    const { image, faceDescriptor } = req.body;

    // ✅ جلب المستخدم + descriptor
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    if (!user.faceDescriptor || user.faceDescriptor.length === 0) {
      return res.status(400).json({
        msg: 'الوجه مش مسجل — سجّل وجهك أولاً',
        faceEnrolled: false,
      });
    }

    let descriptor = null;

    // ✅ الحالة 1: descriptor جاهز
    if (faceDescriptor && Array.isArray(faceDescriptor)) {
      if (faceDescriptor.length !== 128) {
        return res.status(400).json({
          msg: `descriptor غير صحيح — لازم 128 رقم، إنت بعت ${faceDescriptor.length}`,
        });
      }
      descriptor = faceDescriptor;
      console.log('[Face Verify] Using descriptor from client');
    }
    // ✅ الحالة 2: صورة base64
    else if (image) {
      const imageBuffer = dataURLToBuffer(image);
      const result = await getFaceDescriptor(imageBuffer);

      if (!result.success) {
        return res.status(400).json({ msg: result.error });
      }
      descriptor = result.descriptor;
    }
    // ❌ لا image ولا descriptor
    else {
      return res.status(400).json({
        msg: 'مطلوب صورة (image) أو faceDescriptor',
      });
    }

    // ✅ مقارنة
    const comparison = compareFaces(user.faceDescriptor, descriptor);

    console.log(
      '[Face Verify] distance:',
      comparison.distance,
      'match:',
      comparison.match
    );

    if (comparison.match) {
      res.json({
        success: true,
        match: true,
        verified: true,
        distance: comparison.distance,
        confidence: Math.round((1 - comparison.distance) * 100),
        msg: 'تم التحقق من الوجه بنجاح',
      });
    } else {
      res.status(401).json({
        success: false,
        match: false,
        verified: false,
        distance: comparison.distance,
        confidence: Math.round((1 - comparison.distance) * 100),
        msg: '❌ الوجه مش مطابق للمسجل',
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
      msg: 'تم حذف الوجه بنجاح',
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;