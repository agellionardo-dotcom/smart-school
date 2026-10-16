const Company = require('../models/Company');

// ============================================
// ✅ Tenant Middleware
// ============================================
// يحدد الشركة الحالية لكل request
//
// - SuperAdmin → يقدر يشوف كل الشركات
//   + يحدد شركة معينة بـ Header: X-Company-Id
// - الباقي → شركته بس (من JWT)
// ============================================

module.exports = async (req, res, next) => {
  try {
    // ============================================
    // ✅ 1. لو مفيش user (مش مسجل دخول)
    // ============================================
    if (!req.user) {
      return res.status(401).json({
        msg: 'غير مصرح',
        code: 'NO_USER',
      });
    }

    // ============================================
    // ✅ 2. SuperAdmin → يقدر يحدد شركة
    // ============================================
    if (req.user.role === 'superadmin') {
      // يحدد الشركة من الـ Header أو Query
      const targetCompanyId =
        req.headers['x-company-id'] ||
        req.query.companyId ||
        req.body?.companyId;

      if (targetCompanyId) {
        // نتحقق إن الشركة موجودة
        const company = await Company.findById(targetCompanyId);

        if (!company) {
          return res.status(404).json({
            msg: 'الشركة غير موجودة',
            code: 'COMPANY_NOT_FOUND',
          });
        }

        req.company = company;
        req.companyId = company._id;
        req.isSuperAdmin = true;
      }
      // لو مش محدد شركة → نسيبه يكمل (يشوف SuperAdmin Dashboard)
      else {
        req.isSuperAdmin = true;
        req.companyId = null;
      }

      return next();
    }

    // ============================================
    // ✅ 3. المستخدم العادي → شركته
    // ============================================
    if (!req.user.companyId) {
      return res.status(403).json({
        msg: 'الحساب غير مرتبط بشركة',
        code: 'NO_COMPANY',
      });
    }

    // نتحقق إن الشركة موجودة ونشطة
    const company = await Company.findById(req.user.companyId);

    if (!company) {
      return res.status(404).json({
        msg: 'الشركة غير موجودة',
        code: 'COMPANY_NOT_FOUND',
      });
    }

    // لو الشركة موقوفة
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

    // الشركة موقوفة / ملغية / منتهية
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
        // الـ Trial خلص — نحدّث الحالة
        company.subscription.status = 'expired';
        await company.save();

        return res.status(403).json({
          msg: 'انتهت الفترة التجريبية، اشترك للاستمرار',
          code: 'TRIAL_EXPIRED',
        });
      }

      // نحسب الأيام المتبقية
      const daysLeft = Math.ceil(
        (endDate - now) / (1000 * 60 * 60 * 24)
      );
      req.trialDaysLeft = daysLeft;
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
// ✅ Helper: فلتر بسيط حسب الشركة
// ============================================
// يستخدم في Routes عشان نضمن الفلترة
// ============================================
module.exports.companyFilter = (req, extra = {}) => {
  // لو SuperAdmin يشوف كل الشركات → ممكن ما يفلترش
  if (req.isSuperAdmin && !req.companyId) {
    return extra;
  }

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

    // الشركة internal → كل الميزات
    if (req.company.type === 'internal') return next();

    // فحص الميزة
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