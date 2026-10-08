const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true,
  },
  month: {
    type: Number, // 1-12
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  // الراتب الأساسي
  basicSalary: {
    type: Number,
    default: 0,
  },
  // الإضافات
  allowances: {
    housing: { type: Number, default: 0 },      // بدل سكن
    transportation: { type: Number, default: 0 }, // بدل مواصلات
    food: { type: Number, default: 0 },         // بدل طعام
    phone: { type: Number, default: 0 },        // بدل هاتف
    other: { type: Number, default: 0 },        // بدلات أخرى
  },
  // المكافآت
  bonuses: {
    performance: { type: Number, default: 0 },  // مكافأة أداء
    overtime: { type: Number, default: 0 },     // عمل إضافي
    other: { type: Number, default: 0 },        // مكافآت أخرى
  },
  // الخصومات
  deductions: {
    absence: { type: Number, default: 0 },      // خصم غياب
    late: { type: Number, default: 0 },         // خصم تأخير
    insurance: { type: Number, default: 0 },    // تأمينات
    tax: { type: Number, default: 0 },          // ضرائب
    loans: { type: Number, default: 0 },        // سلف
    other: { type: Number, default: 0 },        // خصومات أخرى
  },
  // الإجماليات
  totalAllowances: { type: Number, default: 0 },
  totalBonuses: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  // الحالة
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid'],
    default: 'draft',
    index: true,
  },
  // ملاحظات
  notes: {
    type: String,
    default: '',
  },
  // من أنشأ الراتب
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // من اعتمد الراتب
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  // تاريخ الدفع
  paidAt: Date,
}, {
  timestamps: true,
});

// ✅ فهرس مركب لمنع التكرار (موظف + شهر + سنة)
payrollSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ branch: 1, year: 1, month: 1 });

// ✅ حساب الإجماليات قبل الحفظ
payrollSchema.pre('save', function (next) {
  // إجمالي البدلات
  this.totalAllowances = Object.values(this.allowances || {}).reduce((sum, v) => sum + (v || 0), 0);
  
  // إجمالي المكافآت
  this.totalBonuses = Object.values(this.bonuses || {}).reduce((sum, v) => sum + (v || 0), 0);
  
  // إجمالي الخصومات
  this.totalDeductions = Object.values(this.deductions || {}).reduce((sum, v) => sum + (v || 0), 0);
  
  // صافي الراتب
  this.netSalary = this.basicSalary + this.totalAllowances + this.totalBonuses - this.totalDeductions;
  
  next();
});

module.exports = mongoose.model('Payroll', payrollSchema);