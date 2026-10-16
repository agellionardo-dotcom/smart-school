const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Branch = require('../models/Branch');
const Settings = require('../models/Settings');
const User = require('../models/User');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

// ============================================
// ✅ Helper: المسافة (Haversine)
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
// ✅ Helper: الوقت الحالي بتوقيت القاهرة
// ============================================
function getCairoNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })
  );
}

// ============================================
// ✅ Helper: قراءة أوقات العمل من Settings
// ============================================
async function getWorkHours(companyId) {
  try {
    let settings = await Settings.findOne({ companyId });
    if (!settings) {
      settings = await Settings.create({ companyId });
    }
    return {
      workStartTime: settings.workStartTime || '08:00',
      workEndTime: settings.workEndTime || '14:00',
      lateGraceMinutes: settings.lateGraceMinutes || 15,
    };
  } catch (err) {
    console.warn('getWorkHours error, using defaults:', err.message);
    return {
      workStartTime: '08:00',
      workEndTime: '14:00',
      lateGraceMinutes: 15,
    };
  }
}

// ============================================
// ✅ Helper: تحويل "HH:MM" إلى Date
// ============================================
function timeStringToCairoDate(timeStr, refCairo) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(refCairo);
  d.setHours(h, m, 0, 0);
  return d;
}

// ============================================
// ✅ Helper: حساب lateMinutes
// ============================================
function calculateLateMinutes(workStartTime, workEndTime, graceMinutes) {
  const nowCairo = getCairoNow();
  const workStartCairo = timeStringToCairoDate(workStartTime, nowCairo);
  const workEndCairo = timeStringToCairoDate(workEndTime, nowCairo);

  if (nowCairo < workStartCairo) {
    return { lateMinutes: 0, status: 'present', reason: 'before-start' };
  }

  if (nowCairo <= workEndCairo) {
    const diffMinutes = Math.floor((nowCairo - workStartCairo) / 60000);
    const lateMinutes = Math.max(0, diffMinutes - graceMinutes);
    return {
      lateMinutes,
      status: lateMinutes > 0 ? 'late' : 'present',
      reason: 'in-range',
    };
  }

  return {
    lateMinutes: 0,
    status: null,
    reason: 'after-end',
    error: `التسجيل خارج وقت العمل (${workStartTime} — ${workEndTime})`,
  };
}

// ============================================
// ✅ Helper: check-in
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

    // ✅ نضمن إن الفرع بتاع نفس الشركة
    const branchId = req.user.branch || req.body.branch;
    const branch = await Branch.findOne({
      _id: branchId,
      companyId: req.companyId,
    });

    if (!branch) {
      return res.status(400).json({ msg: 'الفرع غير موجود' });
    }

    const d = distance(lat, lng, branch.location.lat, branch.location.lng);
    if (d > branch.radius) {
      return res.status(400).json({
        msg: `أنت بعيد بـ ${Math.round(d)} متر عن الفرع`,
        distance: Math.round(d),
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ نضمن إن مفيش تسجيل مسبق في نفس الشركة
    const exists = await Attendance.findOne({
      companyId: req.companyId,
      user: req.user.id,
      date: { $gte: today },
      checkIn: { $exists: true },
    });
    if (exists) {
      return res.status(400).json({ msg: 'تم تسجيل الحضور مسبقاً' });
    }

    const { workStartTime, workEndTime, lateGraceMinutes } = await getWorkHours(
      req.companyId
    );

    const result = calculateLateMinutes(
      workStartTime,
      workEndTime,
      lateGraceMinutes
    );

    if (result.error) {
      return res.status(400).json({ msg: result.error });
    }

    const { lateMinutes, status } = result;
    const now = new Date();

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
      companyId: req.companyId,  // ← ✅
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

    const populated = await Attendance.findById(att._id).populate(
      'branch',
      'name type'
    );

    res.json({
      ...populated.toObject(),
      detectedBranch: {
        name: branch.name,
        type: branch.type,
        distance: Math.round(d),
      },
      workHours: {
        start: workStartTime,
        end: workEndTime,
        grace: lateGraceMinutes,
      },
    });
  } catch (err) {
    console.error('checkIn error:', err);
    res.status(500).json({ msg: err.message });
  }
}

// ============================================
// ✅ Helper: check-out
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

    const branch = await Branch.findOne({
      _id: req.user.branch,
      companyId: req.companyId,
    });
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
      companyId: req.companyId,  // ← ✅
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

    const populated = await Attendance.findById(att._id).populate(
      'branch',
      'name type'
    );

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
// ✅ Helper: today
// ============================================
async function todayHandler(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const att = await Attendance.findOne({
      companyId: req.companyId,  // ← ✅
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
// ✅ Route: check-range
// ============================================
router.post('/check-range', auth, tenant, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ inRange: false, msg: 'الموقع مطلوب' });
    }

    const branchId = req.user.branch || req.body.branch;
    const branch = await Branch.findOne({
      _id: branchId,
      companyId: req.companyId,  // ← ✅
    });

    if (!branch) {
      return res.status(400).json({ inRange: false, msg: 'الفرع غير موجود' });
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
    res.status(500).json({ inRange: false, msg: err.message });
  }
});

// ============================================
// ✅ Routes — كلها بـ tenant middleware
// ============================================
router.post('/check-in', auth, tenant, checkInHandler);
router.post('/checkin', auth, tenant, checkInHandler);
router.post('/check-out', auth, tenant, checkOutHandler);
router.post('/checkout', auth, tenant, checkOutHandler);
router.get('/today', auth, tenant, todayHandler);

// ============================================
// ✅ My — كل السجل
// ============================================
router.get('/my', auth, tenant, async (req, res) => {
  try {
    const list = await Attendance.find({
      companyId: req.companyId,  // ← ✅
      user: req.user.id,
    })
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
router.get('/live', auth, tenant, async (req, res) => {
  try {
    // ✅ فلتر المستخدمين (بالشركة)
    let userFilter = {
      companyId: req.companyId,   // ← ✅
      active: true,
      role: { $ne: 'superadmin' },
    };

    // ✅ الفلترة حسب الدور (companyRole + role)
    const role = req.user.companyRole || req.user.role;

    if (role === 'company_owner' || role === 'superadmin' || req.isSuperAdmin) {
      // كل الفروع
    } else if (role === 'hr') {
      const hq = await Branch.findOne({
        companyId: req.companyId,
        type: 'main',
      });
      if (hq && String(req.user.branch) === String(hq._id)) {
        // كل الفروع
      } else {
        userFilter.branch = req.user.branch;
      }
    } else if (role === 'manager') {
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
      companyId: req.companyId,  // ← ✅
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