const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 2, maxlength: 4 },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true },
  defaultServiceMinutes: { type: Number, default: 5, min: 1, max: 120 },
  priorityEnabled: { type: Boolean, default: false }, // admin switch for priority handling
}, { timestamps: true });
module.exports = mongoose.model('Department', schema);
