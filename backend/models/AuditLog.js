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
// ============================================

const auditLogSchema = new mongoose.Schema(
  {
    // ===== من قام بالعملية =====
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: { type: String, index: true },
    userName: { type: String },
    userRole: {
      type: String,
      enum: ['superadmin', 'manager', 'hr', 'employee', 'viewer', 'system', 'anonymous'],
      default: 'system',
    },

    // ===== نوع العملية =====
    action: {
      type: String,
      required: true,
      index: true,
      // login, logout, login_failed, create, update, delete,
      // view, export, approve, reject, publish, settings_change
    },

    // ===== المورد المتأثر =====
    resource: {
      type: String,
      required: true,
      index: true,
      // user, attendance, leave, payroll, announcement, document,
      // branch, emergency, qr, settings, face, etc.
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    // ===== التفاصيل =====
    description: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }, // أي بيانات إضافية
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
    },

    // ===== السياق =====
    ip: { type: String },
    userAgent: { type: String },
    method: { type: String }, // GET, POST, PUT, DELETE
    endpoint: { type: String }, // /api/...

    // ===== الحالة =====
    status: {
      type: String,
      enum: ['success', 'failed', 'warning'],
      default: 'success',
      index: true,
    },
    statusCode: { type: Number }, // 200, 400, 401, 500...

    // ===== التوقيت =====
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    // منع التعديل على السجلات
    strict: true,
  }
);

// ===== Indexes للأداء =====
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

// ===== TTL: نحذف السجلات الأقدم من 90 يوم =====
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 يوم
);

module.exports = mongoose.model('AuditLog', auditLogSchema);