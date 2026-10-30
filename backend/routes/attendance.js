const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Branch = require('../models/Branch');
const Settings = require('../models/Settings');
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
// ✅ Helper: قراءة أوقات العمل من Settings
// ============================================
async function getWorkHours() {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    return {
      workStartTime: settings.workStartTime || '08:00',
      workEndTime: settings.workEndTime || '14:00',
      lateGraceMinutes: settings.lateGraceMinutes || 0,
    };
  } catch (err) {
    console.warn('getWorkHours error, using defaults:', err.message);
    return {
      workStartTime: '08:00',
      workEndTime: '14:00',
      lateGraceMinutes: 0,
    };
  }
}

// ============================================
// ✅ Helper: تحويل "HH:MM" إلى Date (نفس اليوم)
// ============================================
function timeStringToDate(timeStr, refDate = new Date()) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(refDate);
  d.setHours(h, m, 0, 0);
  return d;
}

// ============================================
// ✅ Helper: تسجيل الحضور
// ============================================
async function checkInHandler(req, res) {
  try {
    const {
      lat,
      lng,
      biometricUsed,
      biometricType,
      faceVerified,
      faceDistance,
      deviceId,
    } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ msg: 'الموقع مطلوب' });
    }

    const branch = await Branch.findById(req.user.branch || req.body.branch);
    if (!branch) return res.status(400).json({ msg: 'الفرع غير موجود' });

    const d = distance(lat, lng, branch.location.lat, branch.location.lng);
    if (d > branch.radius) {
      return res.status(400).json({
        msg: `أنت بعيد بـ ${Math.round(d)} متر عن الفرع`,
        distance: Math.round(d),
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

    // ✅ اقرا أوقات العمل من Settings
    const { workStartTime, workEndTime, lateGraceMinutes } = await getWorkHours();

    const now = new Date();
    const workStart = timeStringToDate(workStartTime, now);
    const workEnd = timeStringToDate(workEndTime, now);

    // ✅ منطق جديد
    let lateMinutes = 0;
    let status = 'present';

    if (now < workStart) {
      // جه قبل بداية العمل
      lateMinutes = 0;
      status = 'present';
    } else if (now <= workEnd) {
      // في وقت العمل
      const diffMinutes = Math.floor((now - workStart) / 60000);
      lateMinutes = Math.max(0, diffMinutes - lateGraceMinutes);
      status = lateMinutes > 0 ? 'late' : 'present';
    } else {
      // بعد نهاية العمل
      return res.status(400).json({
        msg: `التسجيل خارج وقت العمل (${workStartTime} — ${workEndTime})`,
        workStartTime,
        workEndTime,
      });
    }

    // ✅ تحديد طريقة التحقق الرئيسية
    let mainMethod = 'gps';
    let verificationMethod = 'gps_only';

    if (faceVerified) {
      mainMethod = 'face';
      verificationMethod = 'face';
    } else if (biometricUsed) {
      mainMethod = 'gps_biometric';
      verificationMethod = 'gps_biometric';
    }

    const att = await Attendance.create({
      user: req.user.id,
      branch: branch._id,
      date: today,
      checkIn: now,
      checkInLocation: { lat, lng },
      lateMinutes,
      status,
      method: mainMethod,
      verification: {
        method: verificationMethod,
        biometricUsed: !!biometricUsed,
        biometricType: biometricType || null,
        faceVerified: !!faceVerified,
        faceDistance: faceDistance || null,
        deviceId: deviceId || null,
      },
    });

    const populated = await Attendance.findById(att._id).populate('branch', 'name type');

    res.json({
      ...populated.toObject(),
      detectedBranch: {
        name: branch.name,
        type: branch.type,
        distance: Math.round(d),
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
    const {
      lat,
      lng,
      biometricUsed,
      biometricType,
      faceVerified,
      faceDistance,
      deviceId,
    } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ msg: 'الموقع مطلوب' });
    }

    const branch = await Branch.findById(req.user.branch);
    if (!branch) return res.status(400).json({ msg: 'الفرع غير موجود' });

    const d = distance(lat, lng, branch.location.lat, branch.location.lng);
    if (d > branch.radius) {
      return res.status(400).json({
        msg: `أنت بعيد بـ ${Math.round(d)} متر عن الفرع`,
        distance: Math.round(d),
      });
    }

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

    if (att.verification) {
      att.verification.biometricUsed =
        att.verification.biometricUsed || !!biometricUsed;
      if (biometricType) att.verification.biometricType = biometricType;
      if (faceVerified) {
        att.verification.faceVerified = true;
        att.verification.faceDistance = faceDistance || null;
      }
      if (deviceId) att.verification.deviceId = deviceId;
    }

    await att.save();

    const populated = await Attendance.findById(att._id).populate('branch', 'name type');

    res.json({
      ...populated.toObject(),
      detectedBranch: {
        name: branch.name,
        type: branch.type,
        distance: Math.round(d),
      },
    });
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
    }).populate('branch', 'name type');

    if (!att) {
      return res.json({
        checkIn: null,
        checkOut: null,
        status: 'absent',
        lateMinutes: 0,
        verification: null,
        branch: null,
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
      branch: att.branch || null,
      checkInLocation: att.checkInLocation || null,
      checkOutLocation: att.checkOutLocation || null,
    });
  } catch (err) {
    console.error('today error:', err);
    res.status(500).json({ msg: err.message });
  }
}

// ============================================
// ✅ Route: التحقق من النطاق الجغرافي
// ============================================
router.post('/check-range', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ 
        inRange: false,
        msg: 'الموقع مطلوب' 
      });
    }

    const branch = await Branch.findById(req.user.branch || req.body.branch);
    if (!branch) {
      return res.status(400).json({
        inRange: false,
        msg: 'الفرع غير موجود',
      });
    }

    const d = distance(lat, lng, branch.location.lat, branch.location.lng);
    const inRange = d <= branch.radius;

    res.json({
      inRange,
      distance: Math.round(d),
      radius: branch.radius,
      branchName: branch.name,
      branchType: branch.type,
      msg: inRange
        ? `أنت داخل نطاق ${branch.name}`
        : `أنت بعيد بـ ${Math.round(d)} متر عن ${branch.name}`,
    });
  } catch (err) {
    console.error('check-range error:', err);
    res.status(500).json({
      inRange: false,
      msg: err.message,
    });
  }
});

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
    const list = await Attendance.find({ user: req.user.id })
      .sort({ date: -1 })
      .populate('branch', 'name type');

    const totalDays = list.filter((a) => a.status !== 'absent').length;
    const totalLate = list.reduce((s, a) => s + (a.lateMinutes || 0), 0);
    const biometricCount = list.filter(
      (a) => a.verification?.biometricUsed
    ).length;
    const faceCount = list.filter(
      (a) => a.verification?.faceVerified
    ).length;

    res.json({
      list,
      totalDays,
      totalLate,
      biometricCount,
      faceCount,
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