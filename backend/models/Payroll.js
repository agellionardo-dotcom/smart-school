const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  // ✅ Multi-tenant
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  month: { type: Number, required: true },
  year: { type: Number, required: true },

  // ===== الأساسيات =====
  basicSalary: { type: Number, default: 0 },
  allowances: [{
    name: String,
    amount: Number,
  }],
  bonuses: [{
    name: String,
    amount: Number,
    reason: String,
  }],

  // ===== الخصومات =====
  deductions: [{
    name: String,
    amount: Number,
    reason: String,
  }],
  absentDays: { type: Number, default: 0 },
  absentDeduction: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  lateDeduction: { type: Number, default: 0 },

  // ===== التأمينات والضرائب =====
  socialInsurance: { type: Number, default: 0 },
  taxDeduction: { type: Number, default: 0 },

  // ===== الإجماليات =====
  grossSalary: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },

  // ===== الحالة =====
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid', 'cancelled'],
    default: 'draft',
  },
  paidAt: { type: Date },
  paymentMethod: { type: String },
  notes: { type: String },
}, { timestamps: true });

// ✅ Compound indexes
payrollSchema.index({ companyId: 1, year: -1, month: -1 });
payrollSchema.index({ companyId: 1, user: 1, year: -1, month: -1 });
payrollSchema.index({ companyId: 1, status: 1 });

// ✅ Unique: مستخدم واحد + شهر واحد في نفس الشركة
payrollSchema.index(
  { companyId: 1, user: 1, month: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model('Payroll', payrollSchema);