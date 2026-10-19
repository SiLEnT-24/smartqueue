// One document per (day, department). $inc on it is atomic => unique sequential numbers.
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  dayKey: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  seq: { type: Number, default: 0 },
});
schema.index({ dayKey: 1, department: 1 }, { unique: true });
module.exports = mongoose.model('DailySequence', schema);
