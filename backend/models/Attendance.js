const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'leave', 'holiday'],
    default: 'present',
  },
  lateMinutes: { type: Number, default: 0 },
  earlyLeaveMinutes: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  workHours: { type: Number, default: 0 },
  method: {
    type: String,
    enum: ['qr', 'face', 'biometric', 'gps', 'manual', 'web'],
    default: 'web',
  },
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  verification: {
    faceVerified: { type: Boolean, default: false },
    biometricUsed: { type: Boolean, default: false },
    qrUsed: { type: Boolean, default: false },
  },
  notes: { type: String },
}, { timestamps: true });

// ✅ Compound indexes
attendanceSchema.index({ companyId: 1, date: -1 });
attendanceSchema.index({ companyId: 1, user: 1, date: -1 });
attendanceSchema.index({ companyId: 1, branch: 1, date: -1 });
attendanceSchema.index({ companyId: 1, status: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);