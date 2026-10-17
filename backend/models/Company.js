// 📁 backend/models/Company.js
// ⬅️ استبدل الملف بالكامل

const mongoose = require('mongoose');
const crypto = require('crypto');

// ============================================
// ✅ Company Schema
// ============================================
const companySchema = new mongoose.Schema(
  {
    // ============================================
    // ✅ 1. معلومات أساسية
    // ============================================
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    logo: { type: String, default: null },
    description: { type: String, default: '' },

    // ============================================
    // ✅ 2. نوع الشركة
    // ============================================
    type: {
      type: String,
      enum: ['internal', 'external'],
      default: 'external',
    },

    // ============================================
    // ✅ 3. معلومات التواصل
    // ============================================
    contactEmail: { type: String, lowercase: true, trim: true, default: null },
    contactPhone: { type: String, trim: true, default: null },
    address: { type: String, default: '' },

    // ============================================
    // ✅ 4. التحقق من الإيميل
    // ============================================
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null, index: true },
    emailVerificationExpires: { type: Date, default: null },

    // ============================================
    // ✅ 5. الإعدادات
    // ============================================
    settings: {
      workStartTime: { type: String, default: '08:00' },
      workEndTime: { type: String, default: '14:00' },
      lateGraceMinutes: { type: Number, default: 15 },
      weekendDays: { type: [Number], default: [5, 6] },
      timezone: { type: String, default: 'Africa/Cairo' },
      currency: { type: String, default: 'EGP' },
      language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    },

    // ============================================
    // ✅ 6. الاشتراك
    // ============================================
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'trial', 'basic', 'pro', 'enterprise', 'internal'],
        default: 'trial',
      },
      status: {
        type: String,
        enum: ['pending_verification', 'active', 'trial', 'suspended', 'expired', 'cancelled'],
        default: 'trial',
      },
      isTrial: { type: Boolean, default: true },
      startDate: { type: Date, default: Date.now },
      endDate: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      maxEmployees: { type: Number, default: 10 },
      maxBranches: { type: Number, default: 2 },
      maxStorage: { type: Number, default: 500 },
      features: {
        type: [String],
        default: ['attendance', 'leaves', 'announcements', 'qr'],
      },
      billing: {
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'EGP' },
        cycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
      },
      lastPayment: {
        date: Date,
        amount: Number,
        method: String,
        reference: String,
      },
      payments: [
        {
          date: { type: Date, default: Date.now },
          amount: Number,
          method: String,
          reference: String,
          status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'paid',
          },
          notes: String,
        },
      ],
    },

    // ============================================
    // ✅ 7. الـ Owner
    // ============================================
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ============================================
    // ✅ 8. الحالة
    // ============================================
    active: { type: Boolean, default: true },

    // ============================================
    // ✅ 9. إحصائيات
    // ============================================
    stats: {
      totalUsers: { type: Number, default: 0 },
      totalBranches: { type: Number, default: 0 },
      lastActivityAt: { type: Date, default: null },
    },

    // ============================================
    // ✅ 10. ملاحظات SuperAdmin
    // ============================================
    notes: { type: String, default: '' },

    // ============================================
    // ✅ 11. مين أنشأ الشركة
    // ============================================
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ============================================
// ✅ Indexes
// ============================================
companySchema.index({ slug: 1 });
companySchema.index({ active: 1 });
companySchema.index({ type: 1 });
companySchema.index({ 'subscription.status': 1 });
companySchema.index({ 'subscription.plan': 1 });
companySchema.index({ createdAt: -1 });
companySchema.index({ ownerId: 1 });

// ============================================
// ✅ Virtuals
// ============================================
companySchema.virtual('isTrialing').get(function () {
  return this.subscription.isTrial && this.subscription.status === 'trial';
});

companySchema.virtual('isSubscriptionActive').get(function () {
  return ['active', 'trial', 'internal'].includes(this.subscription.status);
});

companySchema.virtual('daysLeftInTrial').get(function () {
  if (!this.subscription.isTrial) return null;
  const now = new Date();
  const end = new Date(this.subscription.endDate);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
});

// ============================================
// ✅ Methods
// ============================================
companySchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

companySchema.methods.canAddEmployee = function (currentCount) {
  return currentCount < this.subscription.maxEmployees;
};

companySchema.methods.canAddBranch = function (currentCount) {
  return currentCount < this.subscription.maxBranches;
};

companySchema.methods.hasFeature = function (feature) {
  return this.subscription.features.includes(feature);
};

companySchema.methods.activateSubscription = function ({
  plan,
  amount,
  cycle = 'monthly',
  paymentMethod = 'manual',
  reference = null,
}) {
  const now = new Date();
  const endDate = new Date(now);
  if (cycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
  else if (cycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

  this.subscription.plan = plan;
  this.subscription.status = 'active';
  this.subscription.isTrial = false;
  this.subscription.startDate = now;
  this.subscription.endDate = endDate;
  this.subscription.billing.amount = amount;
  this.subscription.billing.cycle = cycle;
  this.subscription.lastPayment = { date: now, amount, method: paymentMethod, reference };
  this.subscription.payments.push({
    date: now,
    amount,
    method: paymentMethod,
    reference,
    status: 'paid',
  });
  return this.save();
};

companySchema.methods.suspendSubscription = function (reason = '') {
  this.subscription.status = 'suspended';
  this.notes = reason ? `${this.notes}\n[${new Date().toISOString()}] ${reason}` : this.notes;
  return this.save();
};

companySchema.methods.cancelSubscription = function (reason = '') {
  this.subscription.status = 'cancelled';
  this.active = false;
  this.notes = reason ? `${this.notes}\n[${new Date().toISOString()}] ${reason}` : this.notes;
  return this.save();
};

// ============================================
// ✅ Statics
// ============================================
companySchema.statics.getActiveCompanies = function () {
  return this.find({ active: true }).sort({ createdAt: -1 });
};

companySchema.statics.getExpiredTrials = function () {
  return this.find({
    'subscription.isTrial': true,
    'subscription.status': 'trial',
    'subscription.endDate': { $lt: new Date() },
  });
};

companySchema.statics.getTrialsEndingSoon = function (days = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return this.find({
    'subscription.isTrial': true,
    'subscription.status': 'trial',
    'subscription.endDate': { $gte: now, $lte: future },
  });
};

module.exports = mongoose.model('Company', companySchema);