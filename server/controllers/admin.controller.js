const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

// users
exports.listUsers = asyncHandler(async (req, res) => res.json(await User.find().sort('-createdAt')));
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!['student', 'staff', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role');
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  const u = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json(u);
});
exports.updateUser = asyncHandler(async (req, res) => {
  const { role, active, name } = req.body;
  if (String(req.params.id) === String(req.user._id) && (active === false || (role && role !== 'admin')))
    throw new HttpError(400, 'You cannot demote or deactivate yourself');
  const u = await User.findByIdAndUpdate(req.params.id, { $set: { ...(role && { role }), ...(typeof active === 'boolean' && { active }), ...(name && { name }) } }, { new: true, runValidators: true });
  if (!u) throw new HttpError(404, 'User not found');
  res.json(u);
});

// departments
exports.listDepartments = asyncHandler(async (req, res) => {
  const f = req.user && req.user.role === 'admin' ? {} : { active: true };
  res.json(await Department.find(f).sort('name'));
});
exports.listPublicDepartments = asyncHandler(async (req, res) => res.json(await Department.find({ active: true }).sort('name')));
exports.createDepartment = asyncHandler(async (req, res) => res.status(201).json(await Department.create(req.body)));
exports.updateDepartment = asyncHandler(async (req, res) => {
  const d = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!d) throw new HttpError(404, 'Department not found');
  res.json(d);
});

// counters
exports.listCounters = asyncHandler(async (req, res) =>
  res.json(await Counter.find().populate('departments', 'name code').populate('staff', 'name email').sort('name')));
exports.createCounter = asyncHandler(async (req, res) => res.status(201).json(await Counter.create(req.body)));
exports.updateCounter = asyncHandler(async (req, res) => {
  if (req.body.staff) {
    const s = await User.findById(req.body.staff);
    if (!s || s.role !== 'staff') throw new HttpError(400, 'Only staff users can be assigned to a counter');
    await Counter.updateMany({ staff: s._id, _id: { $ne: req.params.id } }, { $set: { staff: null } }); // one counter per staff
  }
  const c = await Counter.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!c) throw new HttpError(404, 'Counter not found');
  res.json(c);
});

exports.auditLogs = asyncHandler(async (req, res) =>
  res.json(await AuditLog.find().sort('-timestamp').limit(200).populate('user', 'name role').populate('token', 'tokenNumber')));
