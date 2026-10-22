const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },
  counter: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter' },
  details: { type: String, default: '' },
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });
module.exports = mongoose.model('AuditLog', schema);
