const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  branch: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Branch', 
    required: true 
  },
  
  checkIn: { type: Date },
  checkOut: { type: Date },
  
  checkInLocation: { lat: Number, lng: Number },
  checkOutLocation: { lat: Number, lng: Number },
  
  lateMinutes: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['present', 'absent', 'late'], 
    default: 'present' 
  },
  
  // ✅ طريقة التسجيل الأساسية
  method: { 
    type: String, 
    enum: ['gps', 'qr', 'manual', 'gps_biometric', 'face'],  // ← أضفنا 'face'
    default: 'gps' 
  },
  
  // ✅ تفاصيل التحقق
  verification: {
    method: {
      type: String,
      enum: [
        'gps_only', 
        'gps_biometric', 
        'gps_qr', 
        'qr_only', 
        'manual',
        'face'              // ← أضفنا 'face'
      ],
      default: 'gps_only'
    },
    biometricUsed: { type: Boolean, default: false },
    biometricType: { type: String, default: null },   // 'fingerprint' | 'faceId' | 'iris'
    faceVerified: { type: Boolean, default: false },  // ← جديد
    faceDistance: { type: Number, default: null },    // ← جديد
    deviceId: { type: String, default: null },
  },
  
  date: { type: Date, default: Date.now }
});

// ✅ Index للأداء
attendanceSchema.index({ user: 1, date: -1 });
attendanceSchema.index({ branch: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);