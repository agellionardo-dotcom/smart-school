// 📁 backend/middleware/tenant.js
// ⬅️ استبدل الملف بالكامل

const Company = require('../models/Company');

// ============================================
// ✅ Tenant Middleware
// ============================================
// يحدد الشركة الحالية لكل request
//
// - SuperAdmin عادي → companyId = null (منصة)
// - SuperAdmin impersonating → companyId من التوكن
// - SuperAdmin يحدد شركة بـ X-Company-Id → precedence
// - المستخدم العادي → شركته من التوكن
// ============================================

module.exports = async (req, res, next) => {
  try {
    // ============================================
    // ✅ 1. لو مفيش user
    // ============================================
    if (!req.user) {
      return res.status(401).json({
        msg: 'غير مصرح',
        code: 'NO_USER',
      });
    }

    // ============================================
    // ✅ 2. SuperAdmin
    // ============================================
    if (req.user.role === 'superadmin') {
      req.isSuperAdmin = true;

      // ✅ أولوية 1: X-Company-Id header
      // (لو SuperAdmin عايز يشوف شركة معينة يدويًا)
      let targetCompanyId =
        req.headers['x-company-id'] ||
        req.query.companyId ||
        null;

      // ✅ أولوية 2: لو impersonating → companyId من التوكن
      if (!targetCompanyId && req.user.isImpersonating && req.user.companyId) {
        targetCompanyId = req.user.companyId;
      }

      if (targetCompanyId) {
        const company = await Company.findById(targetCompanyId).lean();

        if (!company) {
          return res.status(404).json({
            msg: 'الشركة غير موجودة',
            code: 'COMPANY_NOT_FOUND',
          });
        }

        // لو الشركة موقوفة → نرفض (إلا لو داخلها SuperAdmin عايز يشوفها)
        if (!company.active && !req.user.isImpersonating) {
          return res.status(403).json({
            msg: 'الشركة موقوفة',
            code: 'COMPANY_SUSPENDED',
          });
        }

        req.company = company;
        req.companyId = company._id;
        req.subscription = company.subscription;
      } else {
        // SuperAdmin عادي → مفيش شركة محددة
        req.companyId = null;
        req.company = null;
      }

      return next();
    }

    // ============================================
    // ✅ 3. المستخدم العادي
    // ============================================
    if (!req.user.companyId) {
      return res.status(403).json({
        msg: 'الحساب غير مرتبط بشركة',
        code: 'NO_COMPANY',
      });
    }

    const company = await Company.findById(req.user.companyId);

    if (!company) {
      return res.status(404).json({
        msg: 'الشركة غير موجودة',
        code: 'COMPANY_NOT_FOUND',
      });
    }

    if (!company.active) {
      return res.status(403).json({
        msg: 'الشركة موقوفة، تواصل مع الإدارة',
        code: 'COMPANY_SUSPENDED',
      });
    }

    // ============================================
    // ✅ 4. فحص الاشتراك
    // ============================================
    const subscriptionStatus = company.subscription.status;

    if (['suspended', 'cancelled', 'expired'].includes(subscriptionStatus)) {
      return res.status(403).json({
        msg: 'الاشتراك منتهي أو موقوف',
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    // ✅ فحص الـ Trial
    if (company.subscription.isTrial && subscriptionStatus === 'trial') {
      const now = new Date();
      const endDate = new Date(company.subscription.endDate);

      if (endDate < now) {
        company.subscription.status = 'expired';
        await company.save();

        return res.status(403).json({
          msg: 'انتهت الفترة التجريبية، اشترك للاستمرار',
          code: 'TRIAL_EXPIRED',
        });
      }

      req.trialDaysLeft = Math.ceil(
        (endDate - now) / (1000 * 60 * 60 * 24)
      );
    }

    // ============================================
    // ✅ 5. ربط الشركة بالـ request
    // ============================================
    req.company = company;
    req.companyId = company._id;
    req.isSuperAdmin = false;
    req.subscription = company.subscription;

    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({
      msg: 'خطأ في تحديد الشركة',
      error: err.message,
    });
  }
};

// ============================================
// ✅ Helper: فلتر حسب الشركة
// ============================================
// ⚠️ مهم: لو SuperAdmin عادي (companyId = null)
//    → نرجّع فلتر فاضي (عشان يشوف الكل — ده مقصود)
//    لو شركة محددة (impersonating أو عادي)
//    → نرجّع { companyId: ... }
// ============================================
module.exports.companyFilter = (req, extra = {}) => {
  // SuperAdmin عادي (مش داخل شركة) → كل الشركات
  if (req.isSuperAdmin && !req.companyId) {
    return extra;
  }

  // شركة محددة (impersonating أو مستخدم عادي)
  return {
    companyId: req.companyId,
    ...extra,
  };
};

// ============================================
// ✅ Helper: فحص ميزة
// ============================================
module.exports.requireFeature = (feature) => {
  return (req, res, next) => {
    // SuperAdmin → كل الميزات
    if (req.isSuperAdmin) return next();

    if (!req.company) {
      return res.status(403).json({
        msg: 'الحساب غير مرتبط بشركة',
        code: 'NO_COMPANY',
      });
    }

    if (req.company.type === 'internal') return next();

    if (!req.company.subscription.features.includes(feature)) {
      return res.status(403).json({
        msg: `الميزة "${feature}" غير متاحة في خطتك`,
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
      });
    }

    next();
  };
};