const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Branch = require('../models/Branch');
const auth = require('../middleware/auth');

// ============================================
// ✅ دالة حساب المسافة
// ============================================
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================
// ✅ Helper: تسجيل الحضور
// ============================================
async function checkInHandler(req, res) {
  try {
    const { lat, lng, biometricUsed, biometricType, deviceId } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ msg: 'الموقع مطلوب' });
    }

    const branch = await Branch.findById(req.user.branch || req.body.branch);
    if (!branch) return res.status(400).json({ msg: 'الفرع غير موجود' });

    const d = distance(lat, lng, branch.location.lat, branch.location.lng);
    if (d > branch.radius) {
      return res.status(400).json({
        msg: `أنت بعيد بـ ${Math.round(d)} متر عن الفرع`,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exists = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: today },
      checkIn: { $exists: true },
    });
    if (exists) {
      return res.status(400).json({ msg: 'تم تسجيل الحضور مسبقاً' });
    }

    const now = new Date();
    const workStart = new Date();
    workStart.setHours(8, 30, 0, 0);
    const lateMinutes =
      now > workStart ? Math.floor((now - workStart) / 60000) : 0;

    // ✅ تحديد طريقة التحقق
    const verificationMethod = biometricUsed ? 'gps_biometric' : 'gps_only';
    const mainMethod = biometricUsed ? 'gps_biometric' : 'gps';

    const att = await Attendance.create({
      user: req.user.id,
      branch: branch._id,
      date: today,
      checkIn: now,
      checkInLocation: { lat, lng },
      lateMinutes,
      status: lateMinutes > 0 ? 'late' : 'present',
      method: mainMethod,
      verification: {
        method: verificationMethod,
        biometricUsed: !!biometricUsed,
        biometricType: biometricType || null,
        deviceId: deviceId || null,
      },
    });

    res.json(att);
  } catch (err) {
    console.error('checkIn error:', err);
    res.status(500).json({ msg: err.message });
  }
}

// ============================================
// ✅ Helper: تسجيل الانصراف
// ============================================
async function checkOutHandler(req, res) {
  try {
    const { lat, lng, biometricUsed, biometricType, deviceId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const att = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: today },
      checkOut: { $exists: false },
    });
    if (!att) return res.status(400).json({ msg: 'لا يوجد تسجيل حضور' });

    att.checkOut = new Date();
    att.checkOutLocation = { lat, lng };

    // ✅ تحديث verification
    if (att.verification) {
      att.verification.biometricUsed =
        att.verification.biometricUsed || !!biometricUsed;
      if (biometricType) {
        att.verification.biometricType = biometricType;
      }
    }

    await att.save();
    res.json(att);
  } catch (err) {
    console.error('checkOut error:', err);
    res.status(500).json({ msg: err.message });
  }
}

// ============================================
// ✅ Helper: حضور اليوم
// ============================================
async function todayHandler(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const att = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: today, $lt: tomorrow },
    });

    if (!att) {
      return res.json({
        checkIn: null,
        checkOut: null,
        status: 'absent',
        lateMinutes: 0,
        verification: null,
      });
    }

    res.json({
      _id: att._id,
      date: att.date,
      checkIn: att.checkIn || null,
      checkOut: att.checkOut || null,
      status: att.status || 'present',
      lateMinutes: att.lateMinutes || 0,
      method: att.method,
      verification: att.verification || null,
      checkInLocation: att.checkInLocation || null,
      checkOutLocation: att.checkOutLocation || null,
    });
  } catch (err) {
    console.error('today error:', err);
    res.status(500).json({ msg: err.message });
  }
}

// ============================================
// ✅ Routes
// ============================================

router.post('/check-in', auth, checkInHandler);
router.post('/checkin', auth, checkInHandler);
router.post('/check-out', auth, checkOutHandler);
router.post('/checkout', auth, checkOutHandler);
router.get('/today', auth, todayHandler);

// ============================================
// ✅ My — كل السجل
// ============================================
router.get('/my', auth, async (req, res) => {
  try {
    const list = await Attendance.find({ user: req.user.id }).sort({
      date: -1,
    });
    const totalDays = list.filter((a) => a.status !== 'absent').length;
    const totalLate = list.reduce((s, a) => s + (a.lateMinutes || 0), 0);
    const biometricCount = list.filter(
      (a) => a.verification?.biometricUsed
    ).length;

    res.json({
      list,
      totalDays,
      totalLate,
      biometricCount,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ Live — الحضور المباشر
// ============================================
router.get('/live', auth, async (req, res) => {
  try {
    const User = require('../models/User');

    let userFilter = { active: true, role: { $ne: 'superadmin' } };

    if (req.user.role === 'superadmin' || req.user.role === 'viewer') {
      // كل الفروع
    } else if (req.user.role === 'hr') {
      const hq = await Branch.findOne({ type: 'main' });
      if (hq && String(req.user.branch) === String(hq._id)) {
        // كل الفروع
      } else {
        userFilter.branch = req.user.branch;
      }
    } else if (req.user.role === 'manager') {
      userFilter.branch = req.user.branch;
    } else {
      userFilter._id = req.user.id;
    }

    const users = await User.find(userFilter)
      .populate('branch', 'name location type')
      .select('name email position department branch phone');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendances = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
    });

    const report = users.map((user) => {
      const att = todayAttendances.find(
        (a) => String(a.user) === String(user._id)
      );

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          position: user.position,
          department: user.department,
          phone: user.phone,
        },
        branch: user.branch,
        status: att?.checkIn
          ? att.status === 'late'
            ? 'late'
            : 'present'
          : 'absent',
        checkIn: att?.checkIn || null,
        checkOut: att?.checkOut || null,
        lateMinutes: att?.lateMinutes || 0,
        verification: att?.verification || null,
        location: att?.checkInLocation || null,
      };
    });

    res.json(report);
  } catch (err) {
    console.error('live error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;