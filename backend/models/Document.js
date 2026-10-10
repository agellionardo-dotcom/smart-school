const mongoose = require('mongoose');

// ============================================
// ✅ Document Schema
// ============================================
const documentSchema = new mongoose.Schema({
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
      'national_id',      // بطاقة الرقم القومي
      'birth_certificate', // شهادة الميلاد
      'degree',           // المؤهل الدراسي
      'contract',         // العقد
      'health_insurance', // التأمين الصحي
      'social_insurance', // التأمينات الاجتماعية
      'bank_account',     // بيانات البنك
      'experience',       // شهادة خبرة
      'personal_photo',   // صورة شخصية
      'training',         // شهادة تدريب
      'medical_report',   // تقرير طبي
      'driving_license',  // رخصة قيادة
      'signature',        // التوقيع
      'pledge',           // تعهد
      'other',            // أخرى
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
    format: { type: String }, // pdf, jpg, png, ...
    size: { type: Number },   // بالبايت
    originalName: { type: String },
  },

  // ✅ تواريخ مهمة
  issueDate: { type: Date },     // تاريخ الإصدار
  expiryDate: { type: Date },    // تاريخ الانتهاء

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
// ✅ Indexes
// ============================================
documentSchema.index({ user: 1, type: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ expiryDate: 1 });

// ============================================
// ✅ Virtual — هل منتهي؟
// ============================================
documentSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return new Date(this.expiryDate) < new Date();
});

// ============================================
// ✅ Virtual — الأيام المتبقية
// ============================================
documentSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  const diff = new Date(this.expiryDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ✅ تأكد من ظهور الـ virtuals في JSON
documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema);