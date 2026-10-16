const mongoose = require('mongoose');

// ============================================
// ✅ Document Schema
// ============================================
const documentSchema = new mongoose.Schema({
  // ✅ Multi-tenant
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },

  // ✅ الموظف صاحب المستند
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // ✅ نوع المستند
  type: {
    type: String,
    required: true,
    enum: [
      'national_id',
      'birth_certificate',
      'degree',
      'contract',
      'health_insurance',
      'social_insurance',
      'bank_account',
      'experience',
      'personal_photo',
      'training',
      'medical_report',
      'driving_license',
      'signature',
      'pledge',
      'other',
    ],
  },

  // ✅ اسم المستند (وصفي)
  title: {
    type: String,
    required: true,
    trim: true,
  },

  // ✅ معلومات الملف
  file: {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    format: { type: String },
    size: { type: Number },
    originalName: { type: String },
  },

  // ✅ تواريخ مهمة
  issueDate: { type: Date },
  expiryDate: { type: Date },

  // ✅ حالة المستند
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
  },

  // ✅ ملاحظات
  notes: { type: String, trim: true },

  // ✅ من رفع المستند
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // ✅ من وافق/رفض
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: { type: Date },

  // ✅ الأرشفة
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date },

}, { timestamps: true });

// ============================================
// ✅ Indexes (Multi-tenant)
// ============================================
documentSchema.index({ companyId: 1, user: 1, type: 1 });
documentSchema.index({ companyId: 1, status: 1 });
documentSchema.index({ companyId: 1, expiryDate: 1 });
documentSchema.index({ companyId: 1, archived: 1 });

// ============================================
// ✅ Virtuals
// ============================================
documentSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return new Date(this.expiryDate) < new Date();
});

documentSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  const diff = new Date(this.expiryDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema);