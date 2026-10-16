const mongoose = require('mongoose');

// ============================================
// ✅ Settings Schema
// ============================================
// إعدادات كل شركة على حدة (multi-tenant)
// كل شركة عندها Settings واحدة فقط
// ============================================

const settingsSchema = new mongoose.Schema({
  // ✅ Multi-tenant
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,  // ← إعدادات واحدة لكل شركة
    index: true,
  },

  // ===== الهوية البصرية =====
  schoolName: { type: String, default: 'Nabd' },
  logo: { type: String },
  logoText: { type: String, default: '📊' },
  primaryColor: { type: String, default: '#7C7CE0' },
  secondaryColor: { type: String, default: '#8b95a7' },

  // ===== أوقات العمل =====
  workStartTime: { type: String, default: '08:00' },
  workEndTime: { type: String, default: '14:00' },
  lateGraceMinutes: { type: Number, default: 15 },
  weekendDays: { type: [Number], default: [5, 6] },

  // ===== الميزات =====
  enableQRCode: { type: Boolean, default: true },
  enableFaceRecognition: { type: Boolean, default: false },
  enableGeoFence: { type: Boolean, default: true },
  enableBiometric: { type: Boolean, default: false },

  // ===== الـ GPS =====
  defaultRadius: { type: Number, default: 100 }, // متر

  // ===== الإجازات =====
  holidays: [{ type: Date }],
  annualLeaveDays: { type: Number, default: 21 },
  sickLeaveDays: { type: Number, default: 14 },

  // ===== الإشعارات =====
  notifications: {
    attendanceReminder: { type: Boolean, default: true },
    lateAlert: { type: Boolean, default: true },
    leaveUpdate: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
    payroll: { type: Boolean, default: true },
  },

  // ===== اللغة والعملة =====
  language: { type: String, enum: ['ar', 'en'], default: 'ar' },
  currency: { type: String, default: 'EGP' },
  timezone: { type: String, default: 'Africa/Cairo' },

}, { timestamps: true });

// ============================================
// ✅ Indexes
// ============================================
settingsSchema.index({ companyId: 1 }, { unique: true });

// ============================================
// ✅ Statics
// ============================================

// جلب إعدادات شركة (أو إنشاء افتراضية)
settingsSchema.statics.getForCompany = async function (companyId) {
  let settings = await this.findOne({ companyId });

  if (!settings) {
    settings = await this.create({ companyId });
  }

  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);