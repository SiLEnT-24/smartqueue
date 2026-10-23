const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { createAdminAccount, ensureAdminCounter, releaseAdminSlot, reserveAdminSlot } = require('../services/adminRegistration.service');

// users
exports.listUsers = asyncHandler(async (req, res) => res.json(await User.find().sort('-createdAt')));
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!['user', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role');
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  const fields = { name, email, passwordHash: await bcrypt.hash(password, 10) };
  const u = role === 'admin' ? await createAdminAccount(fields) : await User.create({ ...fields, role });
  res.status(201).json(u);
});
exports.updateUser = asyncHandler(async (req, res) => {
  const { role, active, name } = req.body;
  if (String(req.params.id) === String(req.user._id) && (active === false || (role && role !== 'admin')))
    throw new HttpError(400, 'You cannot demote or deactivate yourself');
  const current = role ? await User.findById(req.params.id).select('role') : null;
  if (role && !current) throw new HttpError(404, 'User not found');
  const promoting = role === 'admin' && current.role !== 'admin';
  const demoting = current?.role === 'admin' && role && role !== 'admin';
  const slot = promoting ? await reserveAdminSlot() : null;
  if (demoting) await ensureAdminCounter();
  let u;
  try {
    u = await User.findByIdAndUpdate(req.params.id, { $set: { ...(role && { role }), ...(typeof active === 'boolean' && { active }), ...(name && { name }) } }, { new: true, runValidators: true });
  } catch (error) {
    if (slot) {
      try { await releaseAdminSlot(slot); }
      catch (releaseError) { console.error('Could not release administrator registration slot:', releaseError.message); }
    }
    throw error;
  }
  if (!u) {
    if (slot) await releaseAdminSlot(slot);
    throw new HttpError(404, 'User not found');
  }
  if (demoting) await releaseAdminSlot(await ensureAdminCounter());
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
  res.json(await Counter.find().populate('departments', 'name code').sort('name')));
exports.createCounter = asyncHandler(async (req, res) => res.status(201).json(await Counter.create(req.body)));
exports.updateCounter = asyncHandler(async (req, res) => {
  const c = await Counter.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!c) throw new HttpError(404, 'Counter not found');
  res.json(c);
});

exports.auditLogs = asyncHandler(async (req, res) =>
  res.json(await AuditLog.find().sort('-timestamp').limit(200).populate('user', 'name role').populate('token', 'tokenNumber')));
