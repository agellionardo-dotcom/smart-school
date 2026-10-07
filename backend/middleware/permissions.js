const PERMISSIONS = require('../config/permissions');
const Branch = require('../models/Branch');

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
// 2. التحقق إذا كان المستخدم HR في الفرع الرئيسي (المنيا)
// ============================================================
const isHQHR = async (user) => {
  if (user.role !== 'hr') return false;
  if (!user.branch) return false;
  try {
    const hq = await Branch.findOne({ type: 'main' });
    return hq && String(user.branch) === String(hq._id);
  } catch (e) {
    return false;
  }
};

// ============================================================
// 3. تحديد نطاق الفلترة حسب الفرع
// ============================================================
const scopeToBranch = () => {
  return async (req, res, next) => {
    const { role, branch } = req.user || {};

    // superadmin + viewer → كل الفروع
    if (['superadmin', 'viewer'].includes(role)) {
      req.branchFilter = {};
      req.scope = 'all';
      return next();
    }

    // hr → تحقق إذا في الفرع الرئيسي
    if (role === 'hr') {
      const hq = await isHQHR(req.user);
      if (hq) {
        req.branchFilter = {};
        req.scope = 'all';
        return next();
      }
      if (!branch) {
        return res.status(403).json({ msg: 'المستخدم غير مرتبط بفرع' });
      }
      req.branchFilter = { branch: branch };
      req.scope = 'branch';
      return next();
    }

    // manager → فرعه بس
    if (role === 'manager') {
      if (!branch) {
        return res.status(403).json({ msg: 'المستخدم غير مرتبط بفرع' });
      }
      req.branchFilter = { branch: branch };
      req.scope = 'branch';
      return next();
    }

    // employee → نفسه بس
    if (role === 'employee') {
      req.branchFilter = { _id: req.user._id };
      req.scope = 'own';
      return next();
    }

    return res.status(403).json({ msg: 'دور غير معروف' });
  };
};

// ============================================================
// 4. للموارد اللي بتاعة الموظف نفسه (attendance, leaves)
// ============================================================
const scopeToOwnOrBranch = (branchField = 'branch', userField = 'user') => {
  return async (req, res, next) => {
    const { role, _id, branch } = req.user || {};

    if (['superadmin', 'viewer'].includes(role)) {
      req.dataFilter = {};
      req.scope = 'all';
      return next();
    }

    if (role === 'hr') {
      const hq = await isHQHR(req.user);
      if (hq) {
        req.dataFilter = {};
        req.scope = 'all';
        return next();
      }
      if (!branch) {
        return res.status(403).json({ msg: 'غير مرتبط بفرع' });
      }
      req.dataFilter = { [branchField]: branch };
      req.scope = 'branch';
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
// 5. التحقق من الوصول لملف موظف معين
// ============================================================
const canAccessUser = async (targetUser, reqUser) => {
  const { role, _id, branch } = reqUser || {};
  const targetUserId = targetUser._id?.toString() || targetUser.toString();
  const targetBranchId = targetUser.branch?._id?.toString() || targetUser.branch?.toString();

  if (role === 'superadmin') return true;

  if (role === 'hr') {
    const hq = await isHQHR(reqUser);
    if (hq) return true;
    return targetBranchId === branch?.toString();
  }

  if (role === 'manager') {
    return targetBranchId === branch?.toString();
  }

  if (role === 'employee') {
    return targetUserId === _id?.toString();
  }

  return false;
};

// ============================================================
// 6. تصدير — function + properties (للتوافق مع الكود القديم)
// ============================================================
module.exports = checkPermission;
module.exports.checkPermission = checkPermission;
module.exports.scopeToBranch = scopeToBranch;
module.exports.scopeToOwnOrBranch = scopeToOwnOrBranch;
module.exports.canAccessUser = canAccessUser;
module.exports.isHQHR = isHQHR;
module.exports.default = checkPermission;