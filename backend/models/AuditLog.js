const mongoose = require('mongoose');

// ============================================
// ✅ AuditLog Schema
// ============================================
// يسجل كل العمليات الحساسة في النظام
// - من قام بالعملية
// - نوع العملية
// - المورد المتأثر
// - تفاصيل إضافية
// - IP + User Agent
// - ✅ الشركة (multi-tenant)
// ============================================

const auditLogSchema = new mongoose.Schema(
  {
    // ============================================
    // ✅ Multi-tenant
    // ============================================
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    // ============================================
    // ✅ من قام بالعملية
    // ============================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: { type: String, index: true },
    userName: { type: String },
    userRole: {
      type: String,
      enum: [
        'superadmin',
        'company_owner',
        'manager',
        'hr',
        'employee',
        'viewer',
        'system',
        'anonymous',
      ],
      default: 'system',
    },

    // ============================================
    // ✅ نوع العملية
    // ============================================
    action: {
      type: String,
      required: true,
      index: true,
      // login, logout, login_failed, create, update, delete,
      // view, export, approve, reject, publish, settings_change
    },

    // ============================================
    // ✅ المورد المتأثر
    // ============================================
    resource: {
      type: String,
      required: true,
      index: true,
      // user, attendance, leave, payroll, announcement, document,
      // branch, emergency, qr, settings, face, company, etc.
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    // ============================================
    // ✅ التفاصيل
    // ============================================
    description: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
    },

    // ============================================
    // ✅ السياق
    // ============================================
    ip: { type: String },
    userAgent: { type: String },
    method: { type: String }, // GET, POST, PUT, DELETE
    endpoint: { type: String }, // /api/...

    // ============================================
    // ✅ الحالة
    // ============================================
    status: {
      type: String,
      enum: ['success', 'failed', 'warning'],
      default: 'success',
      index: true,
    },
    statusCode: { type: Number },

    // ============================================
    // ✅ التوقيت
    // ============================================
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// ============================================
// ✅ Indexes (Multi-tenant)
// ============================================

// Indexes أساسية
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ companyId: 1, timestamp: -1 });

// Compound indexes (multi-tenant)
auditLogSchema.index({ companyId: 1, user: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, resource: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, status: 1, timestamp: -1 });

// ============================================
// ✅ TTL: حذف السجلات الأقدم من 90 يوم
// ============================================
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 يوم
);

module.exports = mongoose.model('AuditLog', auditLogSchema);