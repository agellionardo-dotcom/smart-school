const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['main', 'sub'], default: 'sub' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  radius: { type: Number, default: 5 },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrToken: { type: String, unique: true, sparse: true },
  phone: { type: String },
  address: { type: String },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Branch', branchSchema);