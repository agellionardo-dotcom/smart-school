const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['superadmin', 'manager', 'hr', 'employee', 'viewer'],
    default: 'employee'
  },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  phone: { type: String },
  department: { type: String },
  position: { type: String },
  active: { type: Boolean, default: true },
  hireDate: { type: Date, default: Date.now },
  profileImage: { type: String },
  faceDescriptor: [{ type: Number }],
  lastLogin: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
});

module.exports = mongoose.model('User', userSchema);