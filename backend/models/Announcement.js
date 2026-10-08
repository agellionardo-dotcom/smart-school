const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'urgent'],
    default: 'info',
  },
  // ✅ الفرع المستهدف (null = كل الفروع)
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true,
  },
  // ✅ من أنشأ الإعلان
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // ✅ تاريخ الانتهاء (اختياري)
  expiresAt: {
    type: Date,
    default: null,
  },
  // ✅ الإعلان نشط؟
  active: {
    type: Boolean,
    default: true,
    index: true,
  },
  // ✅ الموظفين اللي قرأوا الإعلان
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

announcementSchema.index({ branch: 1, active: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);