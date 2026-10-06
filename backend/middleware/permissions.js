const PERMISSIONS = require('../config/permissions');

// ============================================================
// 1. التحقق من الصلاحية حسب الدور
// ============================================================
const checkPermission = (permission) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const allowedRoles = PERMISSIONS[permission] || [];

    if (!userRole) {
      return res.status(401).json({ msg: 'غير مسجل دخول' });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        msg: 'غير مصرح',
        required: permission,
        yourRole: userRole,
        allowedRoles,
      });
    }

    next();
  };
};

// ============================================================
// 2. تحديد نطاق الفلترة حسب الفرع
//    بيستخدم بعد checkPermission عشان يحدد req.branchFilter
// ============================================================
const scopeToBranch = (scopeType = 'branch') => {
  return (req, res, next) => {
    const { role, branch } = req.user || {};

    // Super Admin / HR / Viewer → كل الفروع
    if (['superadmin', 'hr', 'viewer'].includes(role)) {
      req.branchFilter = {};
      req.scope = 'all';
      return next();
    }

    // Manager → فرعه بس
    if (role === 'manager') {
      if (!branch) {
        return res.status(403).json({ msg: 'المستخدم غير مرتبط بفرع' });
      }
      req.branchFilter = { branch: branch };
      req.scope = 'branch';
      return next();
    }

    // Employee → بياناته الشخصية بس
    if (role === 'employee') {
      req.branchFilter = { _id: req.user._id };
      req.scope = 'own';
      return next();
    }

    return res.status(403).json({ msg: 'دور غير معروف' });
  };
};

// ============================================================
// 3. للموارد اللي بتاعة الموظف نفسه (attendance, leaves)
//    بيحدد req.dataFilter حسب الدور
// ============================================================
const scopeToOwnOrBranch = (branchField = 'branch', userField = 'user') => {
  return (req, res, next) => {
    const { role, _id, branch } = req.user || {};

    if (['superadmin', 'hr', 'viewer'].includes(role)) {
      req.dataFilter = {};
      req.scope = 'all';
      return next();
    }

    if (role === 'manager') {
      if (!branch) {
        return res.status(403).json({ msg: 'غير مرتبط بفرع' });
      }
      req.dataFilter = { [branchField]: branch };
      req.scope = 'branch';
      return next();
    }

    if (role === 'employee') {
      req.dataFilter = { [userField]: _id };
      req.scope = 'own';
      return next();
    }

    return res.status(403).json({ msg: 'غير مصرح' });
  };
};

// ============================================================
// 4. التحقق من الوصول لملف موظف معين
// ============================================================
const canAccessUser = (targetUser) => {
  return (req, res, next) => {
    const { role, _id, branch } = req.user || {};
    const targetUserId = targetUser._id?.toString() || targetUser.toString();
    const targetBranchId = targetUser.branch?._id?.toString() || targetUser.branch?.toString();

    // Admin / HR → كل الموظفين
    if (['superadmin', 'hr'].includes(role)) {
      return next();
    }

    // Manager → موظفي فرعه
    if (role === 'manager') {
      if (targetBranchId === branch?.toString()) {
        return next();
      }
      return res.status(403).json({ msg: 'غير مصرح — الموظف في فرع آخر' });
    }

    // Employee → نفسه بس
    if (role === 'employee') {
      if (targetUserId === _id?.toString()) {
        return next();
      }
      return res.status(403).json({ msg: 'غير مصرح — تقدر تشوف ملفك الشخصي فقط' });
    }

    return res.status(403).json({ msg: 'غير مصرح' });
  };
};

// ============================================================
// 5. تصدير — function + properties (للتوافق مع الكود القديم والجديد)
// ============================================================
module.exports = checkPermission;
module.exports.checkPermission = checkPermission;
module.exports.scopeToBranch = scopeToBranch;
module.exports.scopeToOwnOrBranch = scopeToOwnOrBranch;
module.exports.canAccessUser = canAccessUser;
module.exports.default = checkPermission;