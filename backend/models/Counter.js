const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  active: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Counter', schema);
