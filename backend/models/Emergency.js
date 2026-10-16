const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
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
  },
  type: {
    type: String,
    enum: ['fire', 'medical', 'security', 'accident', 'other'],
    default: 'other',
  },
  description: { type: String },
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'cancelled'],
    default: 'pending',
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: { type: Date },
  notes: { type: String },
}, { timestamps: true });

// ✅ Compound indexes
emergencySchema.index({ companyId: 1, status: 1 });
emergencySchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('Emergency', emergencySchema);