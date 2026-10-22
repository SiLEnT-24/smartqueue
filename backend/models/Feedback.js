const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('Feedback', schema);
