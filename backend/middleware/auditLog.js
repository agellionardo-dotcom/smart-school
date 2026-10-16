const AuditLog = require('../models/AuditLog');

// ============================================
// ✅ Audit Log Helper
// ============================================
// دالة موحدة لتسجيل الأحداث
// ✅ يدعم Multi-tenant (companyId إجباري)
// ============================================

/**
 * تسجيل حدث في الـ Audit Log
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
      companyIdOverride,
    } = options;

    // ============================================
    // ✅ companyId — إجباري
    // ============================================
    const companyId = companyIdOverride || req?.companyId;

    if (!companyId) {
      console.warn('[AuditLog] ⚠️ Missing companyId, skipping log');
      return false;
    }

    // ============================================
    // ✅ user
    // ============================================
    const user = userOverride || req?.user || null;

    // ============================================
    // ✅ IP
    // ============================================
    let ip = 'unknown';
    if (req) {
      ip =
        req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
    }

    // ============================================
    // ✅ User Agent
    // ============================================
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    // ============================================
    // ✅ إنشاء السجل
    // ============================================
    const logData = {
      companyId,                              // ← ✅ إجباري
      user: user?.id || user?._id || null,
      userEmail: user?.email || null,
      userName: user?.name || null,
      userRole: user?.role || user?.companyRole || 'system',
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

    await AuditLog.create(logData);

    console.log(
      `📝 [AuditLog] ${action} ${resource} by ${user?.email || 'system'} @ company ${companyId}`
    );
    return true;
  } catch (err) {
    console.error('❌ [AuditLog] error:', err.message);
    return false;
  }
}

// ============================================
// ✅ Middleware Factory
// ============================================
// استخدام:
// router.post('/users',
//   auth, tenant,
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

    const originalJson = res.json.bind(res);

    res.json = function (data) {
      const status =
        res.statusCode >= 200 && res.statusCode < 300
          ? 'success'
          : res.statusCode >= 400
          ? 'failed'
          : 'warning';

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
// ✅ sanitizeBody — إخفاء كلمات المرور
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