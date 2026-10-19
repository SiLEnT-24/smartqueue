const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true,
           match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
  active: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('User', schema);
