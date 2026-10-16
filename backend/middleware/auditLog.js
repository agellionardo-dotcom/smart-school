const AuditLog = require('../models/AuditLog');

// ============================================
// ✅ Audit Log Helper
// ============================================
// دالة موحدة لتسجيل الأحداث في قاعدة البيانات
// ============================================

/**
 * تسجيل حدث في الـ Audit Log
 * @param {Object} options
 * @param {Object} options.req - Express request (لاستخراج IP, User, UserAgent)
 * @param {String} options.action - نوع العملية (login, create, update, delete...)
 * @param {String} options.resource - المورد (user, attendance, payroll...)
 * @param {String} [options.resourceId] - ID المورد
 * @param {String} [options.description] - وصف مختصر
 * @param {Object} [options.details] - تفاصيل إضافية
 * @param {Object} [options.changes] - قبل / بعد
 * @param {String} [options.status] - success / failed / warning
 * @param {Number} [options.statusCode] - كود الـ HTTP
 * @param {Object} [options.userOverride] - لتجاوز user من req
 */
async function logAction(options) {
  try {
    const {
      req,
      action,
      resource,
      resourceId,
      description,
      details,
      changes,
      status = 'success',
      statusCode,
      userOverride,
    } = options;

    // ===== استخراج بيانات المستخدم =====
    const user = userOverride || req?.user || null;

    // ===== استخراج IP =====
    let ip = 'unknown';
    if (req) {
      ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
    }

    // ===== User Agent =====
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    // ===== إنشاء السجل =====
    const logData = {
      user: user?.id || user?._id || null,
      userEmail: user?.email || null,
      userName: user?.name || null,
      userRole: user?.role || 'system',
      action,
      resource,
      resourceId: resourceId || null,
      description: description || null,
      details: details || null,
      changes: changes || null,
      ip,
      userAgent,
      method: req?.method || null,
      endpoint: req?.originalUrl || null,
      status,
      statusCode: statusCode || null,
      timestamp: new Date(),
    };

    // ===== حفظ =====
    await AuditLog.create(logData);

    console.log(`📝 AuditLog: ${action} ${resource} by ${user?.email || 'system'}`);
    return true;
  } catch (err) {
    // ⚠️ متكسرش التطبيق لو فشل التسجيل
    console.error('❌ AuditLog error:', err.message);
    return false;
  }
}

// ============================================
// ✅ Middleware Factory
// ============================================
// يستخدم لتسجيل تلقائي لعمليات معينة
//
// استخدام:
// router.post('/users',
//   auditMiddleware({
//     action: 'create',
//     resource: 'user',
//     description: 'إنشاء مستخدم جديد'
//   }),
//   createUserHandler
// );
// ============================================
function auditMiddleware(config) {
  return (req, res, next) => {
    const { action, resource, description } = config;

    // نحتفظ بالـ response الأصلي
    const originalJson = res.json.bind(res);

    // نلتقط الـ response
    res.json = function (data) {
      // نحدد الحالة
      const status = res.statusCode >= 200 && res.statusCode < 300
        ? 'success'
        : res.statusCode >= 400
        ? 'failed'
        : 'warning';

      // نسجل بعد إرسال الـ response (لا ننتظر)
      setImmediate(() => {
        logAction({
          req,
          action,
          resource,
          resourceId: data?._id || data?.id || req.params?.id,
          description,
          status,
          statusCode: res.statusCode,
          details: {
            params: req.params,
            body: sanitizeBody(req.body),
          },
        });
      });

      return originalJson(data);
    };

    next();
  };
}

// ============================================
// ✅ تنظيف الـ Body (إخفاء كلمات المرور)
// ============================================
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const cleaned = { ...body };
  const sensitiveFields = [
    'password',
    'newPassword',
    'oldPassword',
    'currentPassword',
    'token',
    'refreshToken',
    'resetToken',
    'apiKey',
    'secret',
  ];

  sensitiveFields.forEach((field) => {
    if (cleaned[field]) {
      cleaned[field] = '***REDACTED***';
    }
  });

  return cleaned;
}

// ============================================
// ✅ Export
// ============================================
module.exports = {
  logAction,
  auditMiddleware,
  sanitizeBody,
};