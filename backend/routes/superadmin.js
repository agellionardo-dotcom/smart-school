const express = require('express');
const router = express.Router();

const Company = require('../models/Company');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

// ============================================
// ✅ Middleware: SuperAdmin فقط
// ============================================
function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({
      msg: '⛔ SuperAdmin فقط',
      code: 'NOT_SUPER_ADMIN',
    });
  }
  next();
}

// ============================================
// ✅ GET /api/superadmin/overview
// نظرة عامة على المنصة
// ============================================
router.get('/overview', auth, requireSuperAdmin, async (req, res) => {
  try {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies,
      activeCompanies,
      trialCompanies,
      suspendedCompanies,
      totalUsers,
      newCompaniesThisMonth,
      newUsersThisMonth,
      activeUsersThisWeek,
      totalAttendanceThisMonth,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ active: true, 'subscription.status': 'active' }),
      Company.countDocuments({ 'subscription.status': 'trial' }),
      Company.countDocuments({ 'subscription.status': 'suspended' }),
      User.countDocuments({ active: true }),
      Company.countDocuments({ createdAt: { $gte: monthAgo } }),
      User.countDocuments({ createdAt: { $gte: monthAgo } }),
      Attendance.distinct('user', { date: { $gte: weekAgo } }),
      Attendance.countDocuments({ date: { $gte: monthAgo } }),
    ]);

    res.json({
      success: true,
      data: {
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          trial: trialCompanies,
          suspended: suspendedCompanies,
          newThisMonth: newCompaniesThisMonth,
        },
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
          activeThisWeek: activeUsersThisWeek.length,
        },
        attendance: {
          totalThisMonth: totalAttendanceThisMonth,
        },
        timestamp: now,
      },
    });
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/superadmin/revenue
// إحصائيات الإيرادات
// ============================================
router.get('/revenue', auth, requireSuperAdmin, async (req, res) => {
  try {
    const companies = await Company.find({
      'subscription.isTrial': false,
      'subscription.status': 'active',
      type: 'external',
    }).select('subscription name slug');

    const monthlyRevenue = companies.reduce((sum, c) => {
      const amount = c.subscription?.billing?.amount || 0;
      const cycle = c.subscription?.billing?.cycle || 'monthly';
      return sum + (cycle === 'yearly' ? amount / 12 : amount);
    }, 0);

    const yearlyRevenue = monthlyRevenue * 12;

    // إيرادات حسب الخطة
    const revenueByPlan = {};
    companies.forEach((c) => {
      const plan = c.subscription.plan || 'unknown';
      const amount = c.subscription.billing?.amount || 0;
      const cycle = c.subscription.billing?.cycle || 'monthly';
      const monthly = cycle === 'yearly' ? amount / 12 : amount;

      if (!revenueByPlan[plan]) {
        revenueByPlan[plan] = { count: 0, monthly: 0 };
      }
      revenueByPlan[plan].count++;
      revenueByPlan[plan].monthly += monthly;
    });

    res.json({
      success: true,
      data: {
        monthlyRecurring: monthlyRevenue,
        yearlyProjected: yearlyRevenue,
        currency: 'EGP',
        payingCompanies: companies.length,
        byPlan: revenueByPlan,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/superadmin/companies/:id/usage
// استخدام شركة معينة
// ============================================
router.get('/companies/:id/usage', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id).lean();
    if (!company) {
      return res.status(404).json({ msg: 'الشركة غير موجودة' });
    }

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      usersCount,
      activeUsersCount,
      attendanceThisMonth,
      lastActivity,
    ] = await Promise.all([
      User.countDocuments({ companyId: id }),
      User.countDocuments({ companyId: id, active: true }),
      Attendance.countDocuments({
        companyId: id,
        date: { $gte: monthAgo },
      }),
      Attendance.findOne({ companyId: id })
        .sort({ date: -1 })
        .select('date')
        .lean(),
    ]);

    const usagePercent = {
      employees: {
        current: usersCount,
        max: company.subscription.maxEmployees,
        percent: Math.round(
          (usersCount / company.subscription.maxEmployees) * 100
        ),
      },
    };

    res.json({
      success: true,
      data: {
        company: {
          name: company.name,
          slug: company.slug,
          type: company.type,
          subscription: company.subscription,
        },
        usage: {
          users: {
            total: usersCount,
            active: activeUsersCount,
            max: company.subscription.maxEmployees,
            percent: usagePercent.employees.percent,
          },
          attendance: {
            thisMonth: attendanceThisMonth,
          },
          lastActivityAt: lastActivity?.date || null,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/superadmin/audit-logs
// سجلات كل الشركات
// ============================================
router.get('/audit-logs', auth, requireSuperAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      companyId,
      user,
      status,
      from,
      to,
      search,
    } = req.query;

    const filter = {};

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (companyId) filter.companyId = companyId;
    if (user) filter.user = user;
    if (status) filter.status = status;

    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    if (search) {
      filter.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { endpoint: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 200);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name email role')
        .populate('companyId', 'name slug')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/superadmin/audit-logs/stats
// إحصائيات السجلات
// ============================================
router.get('/audit-logs/stats', auth, requireSuperAdmin, async (req, res) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [byAction, byResource, byStatus, byCompany, total] =
      await Promise.all([
        AuditLog.aggregate([
          { $match: { timestamp: { $gte: weekAgo } } },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        AuditLog.aggregate([
          { $match: { timestamp: { $gte: weekAgo } } },
          { $group: { _id: '$resource', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AuditLog.aggregate([
          { $match: { timestamp: { $gte: weekAgo } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        AuditLog.aggregate([
          { $match: { timestamp: { $gte: weekAgo } } },
          { $group: { _id: '$companyId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'companies',
              localField: '_id',
              foreignField: '_id',
              as: 'company',
            },
          },
          { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
        ]),
        AuditLog.countDocuments({ timestamp: { $gte: weekAgo } }),
      ]);

    res.json({
      success: true,
      total,
      period: 'last-7-days',
      byAction,
      byResource,
      byStatus,
      byCompany,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/superadmin/trials/ending-soon
// الـ Trials اللي قربت تخلص
// ============================================
router.get('/trials/ending-soon', auth, requireSuperAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const companies = await Company.getTrialsEndingSoon(days);

    res.json({
      success: true,
      count: companies.length,
      days,
      data: companies,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /api/superadmin/trials/expired
// الـ Trials المنتهية
// ============================================
router.get('/trials/expired', auth, requireSuperAdmin, async (req, res) => {
  try {
    const companies = await Company.getExpiredTrials();

    res.json({
      success: true,
      count: companies.length,
      data: companies,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;