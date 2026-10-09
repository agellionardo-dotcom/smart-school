const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ===== البيانات الأساسية =====
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['superadmin', 'manager', 'hr', 'employee', 'viewer'],
    default: 'employee'
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

  // ===== الصورة والبصمة =====
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

  // ===== إعدادات الإشعارات =====
  notificationPrefs: {
    attendanceReminder: { type: Boolean, default: true },
    lateAlert: { type: Boolean, default: true },
    leaveUpdate: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
    emergencies: { type: Boolean, default: true },
    payroll: { type: Boolean, default: true }
  },

  // ===== بيانات النظام =====
  lastLogin: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);