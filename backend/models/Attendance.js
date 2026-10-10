const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  
  checkIn: { type: Date },
  checkOut: { type: Date },
  
  checkInLocation: { lat: Number, lng: Number },
  checkOutLocation: { lat: Number, lng: Number },
  
  lateMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  
  // ✅ طريقة التسجيل الأساسية
  method: { type: String, enum: ['gps', 'qr', 'manual', 'gps_biometric'], default: 'gps' },
  
  // ✅ جديد — تفاصيل التحقق
  verification: {
    method: {
      type: String,
      enum: ['gps_only', 'gps_biometric', 'gps_qr', 'qr_only', 'manual'],
      default: 'gps_only'
    },
    biometricUsed: { type: Boolean, default: false },
    biometricType: { type: String, default: null }, // 'fingerprint' | 'faceId' | 'iris' | null
    deviceId: { type: String, default: null },
  },
  
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);