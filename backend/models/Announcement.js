const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  // ✅ Multi-tenant
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },

  title: { type: String, required: true },
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['info', 'warning', 'urgent'],
    default: 'info',
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
  },
  attachments: [{ type: String }],
  expiresAt: { type: Date },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now },
  }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

// ✅ Compound indexes
announcementSchema.index({ companyId: 1, active: 1, createdAt: -1 });
announcementSchema.index({ companyId: 1, branch: 1 });
announcementSchema.index({ companyId: 1, priority: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);