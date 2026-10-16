const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  // ✅ Multi-tenant
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },

  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['main', 'sub'],
    default: 'sub',
  },
  address: { type: String },
  location: {
    lat: Number,
    lng: Number,
  },
  range: { type: Number, default: 100 }, // متر
  phone: { type: String },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  active: { type: Boolean, default: true },
}, { timestamps: true });

// ✅ Compound indexes
branchSchema.index({ companyId: 1, active: 1 });
branchSchema.index({ companyId: 1, type: 1 });
branchSchema.index({ companyId: 1, name: 1 });

module.exports = mongoose.model('Branch', branchSchema);