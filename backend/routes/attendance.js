const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Branch = require('../models/Branch');
const auth = require('../middleware/auth');

// ============================================
// ✅ دالة حساب المسافة (Haversine)
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
// ✅ Helper: إيجاد أقرب فرع داخل النطاق
// ============================================
async function findNearestBranch(lat, lng) {
  // جلب كل الفروع النشطة
  const branches = await Branch.find({ active: true });

  let matchedBranch = null;
  let minDistance = Infinity;
  let closestBranch = null;
  let closestDistance = Infinity;

  for (const branch of branches) {
    // تخطي الفروع اللي مش عندها إحداثيات
    if (!branch.location?.lat || !branch.location?.lng) continue;

    const d = distance(lat, lng, branch.location.lat, branch.location.lng);

    // تتبع أقرب فرع عموماً (حتى لو خارج النطاق)
    if (d < closestDistance) {
      closestDistance = d;
      closestBranch = branch;
    }

    // تتبع أقرب فرع داخل النطاق
    if (d <= branch.radius && d < minDistance) {
      minDistance = d;
      matchedBranch = branch;
    }
  }

  return {
    matchedBranch,
    matchedDistance: matchedBranch ? Math.round(minDistance) : null,
    closestBranch,
    closestDistance: closestBranch ? Math.round(closestDistance) : null,
  };
}

// ============================================
// ✅ Helper: تسجيل الحضور (يُستخدم من مسارين)
// ============================================
async function checkInHandler(req, res) {
  try {
    const { lat, lng } = req.body;

    // ✅ التحقق من وجود الإحداثيات
    if (lat == null || lng == null) {
      return res.status(400).json({ msg: '⚠️ لم يتم تحديد الموقع — من فضلك فعّل GPS' });
    }

    // ✅ إيجاد أقرب فرع
    const { matchedBranch, matchedDistance, closestBranch, closestDistance } =
      await findNearestBranch(lat, lng);

    // ✅ لو مفيش فرع داخل النطاق
    if (!matchedBranch) {
      const nearestMsg = closestBranch
        ? `أقرب فرع: ${closestBranch.name} (${closestDistance} متر)`
        : 'لا توجد فروع متاحة';
      return res.status(400).json({
        msg: `⚠️ أنت خارج نطاق جميع الفروع. ${nearestMsg}`,
      });
    }

    // ✅ التحقق من عدم وجود تسجيل مسبق
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

    // ✅ حساب التأخير
    const now = new Date();
    const workStart = new Date();
    workStart.setHours(8, 30, 0, 0);
    const lateMinutes =
      now > workStart ? Math.floor((now - workStart) / 60000) : 0;

    // ✅ إنشاء السجل
    const att = await Attendance.create({
      user: req.user.id,
      branch: matchedBranch._id,
      date: today,
      checkIn: now,
      checkInLocation: { lat, lng },
      lateMinutes,
      status: lateMinutes > 0 ? 'late' : 'present',
    });

    // ✅ إرجاع السجل + معلومات الفرع
    res.json({
      ...att.toObject(),
      detectedBranch: {
        _id: matchedBranch._id,
        name: matchedBranch.name,
        type: matchedBranch.type,
        distance: matchedDistance,
      },
    });
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
    const { lat, lng } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const att = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: today },
      checkOut: { $exists: false },
    });
    if (!att) return res.status(400).json({ msg: 'لا يوجد تسجيل حضور' });

    // ✅ لو لقى فرع داخل النطاق → حدّث الفرع
    let detectedBranch = null;
    let detectedDistance = null;
    if (lat != null && lng != null) {
      const { matchedBranch, matchedDistance } = await findNearestBranch(lat, lng);
      if (matchedBranch) {
        detectedBranch = {
          _id: matchedBranch._id,
          name: matchedBranch.name,
          type: matchedBranch.type,
          distance: matchedDistance,
        };
        detectedDistance = matchedDistance;
      }
    }

    att.checkOut = new Date();
    if (lat != null && lng != null) {
      att.checkOutLocation = { lat, lng };
    }
    await att.save();

    res.json({
      ...att.toObject(),
      detectedBranch,
      detectedDistance,
    });
  } catch (err) {
    console.error('checkOut error:', err);
    res.status(500).json({ msg: err.message });
  }
}

// ============================================
// ✅ Helper: حضور اليوم (today)
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
    }).populate('branch', 'name type location radius');

    if (!att) {
      return res.json({
        checkIn: null,
        checkOut: null,
        status: 'absent',
        lateMinutes: 0,
      });
    }

    res.json({
      _id: att._id,
      date: att.date,
      checkIn: att.checkIn || null,
      checkOut: att.checkOut || null,
      status: att.status || 'present',
      lateMinutes: att.lateMinutes || 0,
      checkInLocation: att.checkInLocation || null,
      checkOutLocation: att.checkOutLocation || null,
      branch: att.branch || null,
    });
  } catch (err) {
    console.error('today error:', err);
    res.status(500).json({ msg: err.message });
  }
}

// ============================================
// ✅ Routes
// ============================================

// --- Check-in ---
router.post('/check-in', auth, checkInHandler);
router.post('/checkin', auth, checkInHandler);

// --- Check-out ---
router.post('/check-out', auth, checkOutHandler);
router.post('/checkout', auth, checkOutHandler);

// --- Today ---
router.get('/today', auth, todayHandler);

// --- My (كل السجل) ---
router.get('/my', auth, async (req, res) => {
  try {
    const list = await Attendance.find({ user: req.user.id })
      .populate('branch', 'name type')
      .sort({ date: -1 });
    const totalDays = list.filter((a) => a.status !== 'absent').length;
    const totalLate = list.reduce((s, a) => s + (a.lateMinutes || 0), 0);
    res.json({ list, totalDays, totalLate });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ الحضور المباشر (Live Dashboard)
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
        // HR في الفرع الرئيسي — كل الفروع
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
    }).populate('branch', 'name');

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
        branch: att?.branch || user.branch,
        status: att?.checkIn
          ? att.status === 'late'
            ? 'late'
            : 'present'
          : 'absent',
        checkIn: att?.checkIn || null,
        checkOut: att?.checkOut || null,
        lateMinutes: att?.lateMinutes || 0,
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