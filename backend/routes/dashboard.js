// backend/routes/dashboard.js
// ============================================
// Dashboard Routes
// - my-stats: للموظف (إحصائياته الشخصية)
// - team-stats: للإدارة (إحصائيات الفريق)
// ============================================

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Branch = require('../models/Branch');

// ============================================
// ✅ Helper: نطاق الفلترة حسب الدور
// ============================================
async function getUserScope(user) {
  // superadmin / viewer → كل الفروع
  if (user.role === 'superadmin' || user.role === 'viewer') {
    return { scope: 'all', branchIds: null };
  }

  // hr → فحص الفرع الرئيسي
  if (user.role === 'hr') {
    const hq = await Branch.findOne({ type: 'main' });
    if (hq && String(user.branch) === String(hq._id)) {
      return { scope: 'all', branchIds: null };
    }
    return { scope: 'branch', branchIds: [user.branch] };
  }

  // manager → فرعه بس
  if (user.role === 'manager') {
    return { scope: 'branch', branchIds: [user.branch] };
  }

  // employee → نفسه بس
  return { scope: 'self', branchIds: null };
}

// ============================================
// ✅ Helper: حساب المدى الزمني
// ============================================
function getMonthRange(month, year) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// ============================================
// ✅ 1. GET /api/dashboard/my-stats
// إحصائيات الموظف الشخصية
// ============================================
router.get('/my-stats', auth, async (req, res) => {
  try {
    const today = new Date();
    const month = parseInt(req.query.month) || today.getMonth() + 1;
    const year = parseInt(req.query.year) || today.getFullYear();

    const { start, end } = getMonthRange(month, year);

    // ✅ جلب كل حضور الموظف في الشهر
    const records = await Attendance.find({
      user: req.user.id,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .select('date checkIn checkOut status lateMinutes method verification');

    // ✅ حساب الإحصائيات
    const present = records.filter((r) => r.status === 'present').length;
    const late = records.filter((r) => r.status === 'late').length;
    const totalLateMinutes = records.reduce(
      (sum, r) => sum + (r.lateMinutes || 0),
      0
    );

    // ✅ أيام العمل المتوقعة (من 1 للنهاردة — بدون جُمَع)
    const now = new Date();
    const isCurrentMonth =
      month === now.getMonth() + 1 && year === now.getFullYear();
    const lastDay = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();

    let expectedWorkDays = 0;
    for (let d = 1; d <= lastDay; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 5) expectedWorkDays++; // الجمعة = 5
    }

    // ✅ الغياب = الأيام المتوقعة - (الحضور + التأخير)
    const totalPresent = present + late;
    const absent = Math.max(0, expectedWorkDays - totalPresent);
    const attendanceRate =
      expectedWorkDays > 0
        ? Math.round((totalPresent / expectedWorkDays) * 100)
        : 0;

    // ✅ تفاصيل كل يوم
    const days = records.map((r) => ({
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
      lateMinutes: r.lateMinutes || 0,
      method: r.method,
      biometricUsed: r.verification?.biometricUsed || false,
      faceVerified: r.verification?.faceVerified || false,
    }));

    res.json({
      month,
      year,
      monthName: new Date(year, month - 1).toLocaleDateString('ar-EG', {
        month: 'long',
        year: 'numeric',
      }),
      stats: {
        present,
        late,
        absent,
        totalPresent,
        expectedWorkDays,
        totalLateMinutes,
        attendanceRate,
      },
      days,
    });
  } catch (err) {
    console.error('my-stats error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ 2. GET /api/dashboard/team-stats
// إحصائيات الفريق للإدارة
// ============================================
router.get('/team-stats', auth, async (req, res) => {
  try {
    // ✅ فحص الصلاحيات
    const allowedRoles = ['superadmin', 'hr', 'manager', 'viewer'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'غير مصرح' });
    }

    // ✅ تحديد النطاق
    const scope = await getUserScope(req.user);

    // ✅ فلتر الفروع
    let branchFilter = null;
    if (scope.scope === 'branch') {
      branchFilter = scope.branchIds;
    } else if (req.query.branch) {
      // HR رئيسي اختار فرع معين
      branchFilter = [req.query.branch];
    }

    // ✅ المدى الزمني
    const today = new Date();
    const month = parseInt(req.query.month) || today.getMonth() + 1;
    const year = parseInt(req.query.year) || today.getFullYear();

    const todayRange = getTodayRange();
    const monthRange = getMonthRange(month, year);

    // ✅ فلتر المستخدمين
    const userFilter = { active: true, role: { $ne: 'superadmin' } };
    if (branchFilter) userFilter.branch = { $in: branchFilter };

    const users = await User.find(userFilter)
      .populate('branch', 'name type')
      .select('name email position department branch role');

    const userIds = users.map((u) => u._id);

    // ✅ حضور اليوم
    const todayAttendances = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: todayRange.start, $lt: todayRange.end },
    }).populate('user', 'name position branch');

    // ✅ حضور الشهر
    const monthAttendances = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: monthRange.start, $lte: monthRange.end },
    });

    // ✅ تقسيم اليوم
    const presentList = [];
    const absentList = [];
    const lateList = [];

    users.forEach((u) => {
      const att = todayAttendances.find(
        (a) => String(a.user._id) === String(u._id)
      );

      if (!att || !att.checkIn) {
        absentList.push({
          _id: u._id,
          name: u.name,
          position: u.position,
          branch: u.branch,
        });
      } else if (att.status === 'late') {
        lateList.push({
          _id: u._id,
          name: u.name,
          position: u.position,
          branch: u.branch,
          checkIn: att.checkIn,
          lateMinutes: att.lateMinutes || 0,
        });
      } else {
        presentList.push({
          _id: u._id,
          name: u.name,
          position: u.position,
          branch: u.branch,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
        });
      }
    });

    // ✅ إحصائيات الشهر
    const monthly = {
      totalPresent: monthAttendances.filter(
        (a) => a.checkIn && a.status === 'present'
      ).length,
      totalLate: monthAttendances.filter((a) => a.status === 'late').length,
      totalLateMinutes: monthAttendances.reduce(
        (sum, a) => sum + (a.lateMinutes || 0),
        0
      ),
    };

    // ✅ قائمة الفروع (لو HR رئيسي)
    let branchesList = [];
    if (scope.scope === 'all') {
      branchesList = await Branch.find().select('name type');
    }

    res.json({
      scope: scope.scope,
      month,
      year,
      today: {
        totalEmployees: users.length,
        present: presentList.length,
        absent: absentList.length,
        late: lateList.length,
        presentList: presentList.sort((a, b) =>
          new Date(a.checkIn) - new Date(b.checkIn)
        ),
        absentList: absentList.sort((a, b) =>
          a.name.localeCompare(b.name, 'ar')
        ),
        lateList: lateList.sort((a, b) => b.lateMinutes - a.lateMinutes),
      },
      monthly,
      branches: branchesList,
    });
  } catch (err) {
    console.error('team-stats error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;