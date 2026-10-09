const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Branch = require('../models/Branch');

// ============================================
// ✅ بناء Context المستخدم حسب دوره
// ============================================
async function buildUserContext(user) {
  const context = {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position || null,
      department: user.department || null,
      phone: user.phone || null,
      branch: null,
    },
    attendance: null,
    leaves: null,
    team: null,
  };

  // ✅ بيانات الفرع
  if (user.branch) {
    const branch = await Branch.findById(user.branch).select('name type location');
    if (branch) {
      context.user.branch = {
        name: branch.name,
        type: branch.type === 'main' ? 'الفرع الرئيسي' : 'فرع فرعي',
      };
    }
  }

  // ✅ آخر 7 أيام حضور
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentAttendance = await Attendance.find({
    user: user._id,
    date: { $gte: sevenDaysAgo },
  })
    .sort({ date: -1 })
    .limit(7)
    .select('date checkIn checkOut status lateMinutes');

  context.attendance = {
    totalPresent: recentAttendance.filter(a => a.checkIn).length,
    totalLate: recentAttendance.filter(a => a.status === 'late').length,
    totalAbsent: 7 - recentAttendance.length,
    totalLateMinutes: recentAttendance.reduce((s, a) => s + (a.lateMinutes || 0), 0),
    lastCheckIn: recentAttendance.find(a => a.checkIn)?.checkIn || null,
    lastCheckOut: recentAttendance.find(a => a.checkOut)?.checkOut || null,
    todayStatus: recentAttendance[0]?.status || 'absent',
  };

  // ✅ رصيد الإجازات
  const leaves = await Leave.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('type startDate endDate status days');

  const approved = leaves.filter(l => l.status === 'approved');
  const pending = leaves.filter(l => l.status === 'pending');

  context.leaves = {
    total: leaves.length,
    approved: approved.length,
    pending: pending.length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
    totalDaysUsed: approved.reduce((s, l) => s + (l.days || 0), 0),
    recent: leaves.slice(0, 5).map(l => ({
      type: l.type,
      startDate: l.startDate,
      endDate: l.endDate,
      status: l.status,
      days: l.days,
    })),
  };

  // ✅ للمديرين والـ HR — بيانات الفريق
  if (['superadmin', 'hr', 'manager'].includes(user.role)) {
    let teamFilter = { active: true, role: { $ne: 'superadmin' } };

    // HR في الفرع الرئيسي يشوف الكل
    if (user.role === 'manager') {
      teamFilter.branch = user.branch;
    } else if (user.role === 'hr') {
      const hq = await Branch.findOne({ type: 'main' });
      if (!hq || String(user.branch) !== String(hq._id)) {
        teamFilter.branch = user.branch;
      }
    }

    const team = await User.find(teamFilter).select('name position branch');

    context.team = {
      totalEmployees: team.length,
      branchBreakdown: await Branch.aggregate([
        { $match: { _id: { $in: team.map(t => t.branch).filter(Boolean) } } },
        { $group: { _id: '$name', count: { $sum: 1 } } },
      ]).then(r => r.map(x => ({ branch: x._id, count: x.count }))),
    };
  }

  return context;
}

// ============================================
// ✅ System Prompt
// ============================================
function buildSystemPrompt(context) {
  return `أنت مساعد ذكي في تطبيق "Smart School" — نظام إدارة حضور وموارد بشرية.

## 🎯 مهمتك:
مساعدة الموظفين والمديرين بالإجابة على أسئلتهم بناءً على البيانات المتاحة.

## 👤 بيانات المستخدم الحالي:
${JSON.stringify(context.user, null, 2)}

## 📊 سجل الحضور (آخر 7 أيام):
${JSON.stringify(context.attendance, null, 2)}

## 🏖️ الإجازات:
${JSON.stringify(context.leaves, null, 2)}

${context.team ? `## 👥 بيانات الفريق:\n${JSON.stringify(context.team, null, 2)}` : ''}

## 📋 قواعد مهمة:
1. **تكلّم بالعربية** دايماً — لهجة مصرية بسيطة أو فصحى سهلة
2. **كن مختصراً ومفيداً** — إجابة مباشرة بدون حشو
3. **استخدم الأرقام الحقيقية** من البيانات فوق
4. **لو مش عندك بيانات** — قول "معنديش بيانات كافية" ولا تخترع
5. **لو السؤال مش متعلق بالنظام** — قول "أنا مساعد HR بس، مقدرش أساعد في ده"
6. **استخدم الإيموجي** بشكل معتدل لتوضيح الإجابة
7. **اقترح روابط** لو المستخدم يحتاج صفحة معينة (مثلاً: "روح لصفحة /leaves")

## 🎨 أمثلة على الإجابات:

**س:** كام يوم إجازة متبقي عندي؟
**ج:** ليك **12 يوم** إجازة متبقية من أصل 21. استخدمت 9 أيام في 3 طلبات. 🏖️

**س:** إمتى آخر مرة سجّلت حضور؟
**ج:** آخر تسجيل حضور كان **النهاردة الساعة 8:45 ص** ✅ — ومسجّلتش انصراف لسه.

**س:** كام موظف في فرعي؟
**ج:** فرعك فيه **15 موظف** نشط. 3 منهم غايبين النهاردة.

**س:** مين المدير بتاعي؟
**ج:** المدير المباشر بتاعك هو **أ. محمد إسماعيل** — مدير فرع ملوي.

## ⚠️ تحذيرات:
- متدّيش معلومات حساسة عن موظفين تانيين (لغير المدراء)
- لو في شك، قول "كلم الـ HR"
- متعملش أي تعديل على البيانات — إنت مساعد للقراءة فقط
`;
}

module.exports = {
  buildUserContext,
  buildSystemPrompt,
};