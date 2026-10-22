const mongoose = require('mongoose');
const STATUSES = ['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED', 'NO_SHOW', 'CANCELLED', 'ON_HOLD'];
const schema = new mongoose.Schema({
  tokenNumber: { type: String, required: true },          // e.g. EX-001
  dayKey: { type: String, required: true },
  seq: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  status: { type: String, enum: STATUSES, default: 'WAITING' },
  active: { type: Boolean, default: true },      // false once COMPLETED/CANCELLED/NO_SHOW
  occupying: { type: Boolean, default: false },  // currently holding a counter (CALLED/SERVING)
  counter: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter', default: null },
  priority: { type: Boolean, default: false },
  priorityHistory: [{ by: mongoose.Schema.Types.ObjectId, reason: String, value: Boolean, at: Date }],
  queuedAt: { type: Date, default: Date.now },   // ordering key (FIFO)
  calledAt: Date, startedAt: Date, completedAt: Date,
  estimatedWaitMin: { type: Number, default: 0 },
  allocationNote: { type: String, default: '' },
}, { timestamps: true });

// Unique token numbers per day
schema.index({ dayKey: 1, tokenNumber: 1 }, { unique: true });
// One active token per user per department (DB-level guard against duplicates)
schema.index({ user: 1, department: 1 }, { unique: true, partialFilterExpression: { active: true } });
// A counter can hold only one CALLED/SERVING token (DB-level guard)
schema.index({ counter: 1 }, { unique: true, partialFilterExpression: { occupying: true } });
schema.index({ department: 1, status: 1, priority: -1, queuedAt: 1 });

module.exports = mongoose.model('Token', schema);
module.exports.STATUSES = STATUSES;
