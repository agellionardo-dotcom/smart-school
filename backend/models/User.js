const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ============================================
  // ✅ Multi-tenant — مربوط بأي شركة
  // ============================================
  companyId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Company',
  required: function() {
    // ✅ السوبر أدمن (مدير المنصة) مش لازم يكون مربوط بشركة
    return this.role !== 'superadmin';
  },
  index: true,
  default: null,
},

  // ===== البيانات الأساسية =====
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  
  // ✅ الدور العام (في المنصة)
  role: {
    type: String,
    enum: ['superadmin', 'manager', 'hr', 'employee', 'viewer'],
    default: 'employee',
  },

  // ✅ الدور في الشركة (multi-tenant)
  companyRole: {
    type: String,
    enum: ['company_owner', 'manager', 'hr', 'employee', 'viewer'],
    default: 'employee',
  },

  // ===== البيانات الوظيفية =====
  employeeId: { type: String, unique: true, sparse: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  department: { type: String },
  position: { type: String },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hireDate: { type: Date, default: Date.now },
  contractType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'intern'],
    default: 'full-time'
  },
  contractEndDate: { type: Date },
  active: { type: Boolean, default: true },

  // ===== البيانات المالية =====
  salary: { type: Number, default: 0 },
  bankAccount: { type: String },
  socialInsurance: { type: String },

  // ===== البيانات الشخصية =====
  phone: { type: String },
  gender: {
    type: String,
    enum: ['male', 'female', ''],
    default: ''
  },
  nationalId: { type: String, unique: true, sparse: true },
  birthDate: { type: Date },
  address: { type: String },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relation: { type: String }
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],

  // ===== الصورة والـ Face =====
  profileImage: { type: String },
  faceDescriptor: [{ type: Number }],

  // ===== الإشعارات (Push Notifications) =====
  fcmTokens: [{
    token: { type: String, required: true },
    platform: {
      type: String,
      enum: ['web', 'android', 'ios'],
      default: 'web'
    },
    addedAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now }
  }],

  // ===== تفضيلات الإشعارات =====
  notificationPrefs: {
    attendanceReminder: { type: Boolean, default: true },
    lateAlert: { type: Boolean, default: true },
    leaveUpdate: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
    emergencies: { type: Boolean, default: true },
    payroll: { type: Boolean, default: true }
  },

  // ✅ التفضيلات العامة
  preferences: {
    biometricLogin: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'ar' }
  },

  // ✅ الأجهزة الموثوقة (للبصمة)
  trustedDevices: [{
    deviceId: { type: String, required: true },
    deviceName: { type: String },
    deviceModel: { type: String },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android'
    },
    biometricEnabled: { type: Boolean, default: false },
    biometricType: { type: String },
    refreshToken: { type: String, select: false },
    lastLogin: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  }],

  // ===== بيانات النظام =====
  lastLogin: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

// ============================================
// ✅ Indexes (Multi-tenant)
// ============================================
userSchema.index({ companyId: 1, email: 1 });
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ companyId: 1, active: 1 });
userSchema.index({ companyId: 1, branch: 1 });
userSchema.index({ companyId: 1, employeeId: 1 });

// ============================================
// ✅ Virtuals
// ============================================
userSchema.virtual('isSuperAdmin').get(function () {
  return this.role === 'superadmin';
});

userSchema.virtual('isCompanyOwner').get(function () {
  return this.companyRole === 'company_owner';
});

// ============================================
// ✅ Methods
// ============================================
userSchema.methods.hasRole = function (roles) {
  const roleList = Array.isArray(roles) ? roles : [roles];
  return roleList.includes(this.role) || roleList.includes(this.companyRole);
};

userSchema.methods.canManageUsers = function () {
  return ['superadmin', 'company_owner', 'hr'].includes(this.companyRole);
};

userSchema.methods.canManagePayroll = function () {
  return ['superadmin', 'company_owner'].includes(this.companyRole);
};

// ============================================
// ✅ Statics
// ============================================
userSchema.statics.findByCompany = function (companyId, filter = {}) {
  return this.find({ companyId, ...filter });
};

userSchema.statics.countByCompany = function (companyId) {
  return this.countDocuments({ companyId, active: true });
};

module.exports = mongoose.model('User', userSchema);