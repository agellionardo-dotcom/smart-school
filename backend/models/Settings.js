const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  schoolName: { type: String, default: 'Smart School' },
  logo: { type: String },
  logoText: { type: String, default: '🎓' },
  primaryColor: { type: String, default: '#0a1f44' },
  secondaryColor: { type: String, default: '#8b95a7' },
  workStartTime: { type: String, default: '08:30' },
  workEndTime: { type: String, default: '17:00' },
  lateGraceMinutes: { type: Number, default: 0 },
  enableQRCode: { type: Boolean, default: false },
  enableFaceRecognition: { type: Boolean, default: false },
  enableGeoFence: { type: Boolean, default: true },
  defaultRadius: { type: Number, default: 5 },
  holidays: [{ type: Date }],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);