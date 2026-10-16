const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['annual', 'sick', 'unpaid', 'maternity', 'emergency', 'other'],
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  attachments: [{ type: String }],
}, { timestamps: true });

// ✅ Compound indexes
leaveSchema.index({ companyId: 1, status: 1 });
leaveSchema.index({ companyId: 1, user: 1 });
leaveSchema.index({ companyId: 1, startDate: -1 });

module.exports = mongoose.model('Leave', leaveSchema);