const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
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
  },
  type: {
    type: String,
    enum: ['fire', 'medical', 'security', 'evacuation', 'other'],
    default: 'other',
  },
  message: {
    type: String,
    default: '',
    maxlength: 500,
  },
  location: {
    lat: Number,
    lng: Number,
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active',
    index: true,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: Date,
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// ✅ فهرس مركب للبحث السريع
emergencySchema.index({ status: 1, createdAt: -1 });
emergencySchema.index({ branch: 1, status: 1 });

module.exports = mongoose.model('Emergency', emergencySchema);