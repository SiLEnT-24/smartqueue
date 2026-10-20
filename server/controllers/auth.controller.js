const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  // Role is ALWAYS student on public registration. Staff/admin are created by an admin.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'student' });
  res.status(201).json({ token: sign(user), user: pub(user) });
});

exports.registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

  await User.init();
  const setupState = User.db.collection('setup_state');
  const registrationClosed = { _id: 'admin-registration-closed', closedAt: new Date() };
  if (await setupState.findOne({ _id: registrationClosed._id })) {
    throw new HttpError(409, 'Admin registration is closed.');
  }
  if (await User.exists({ role: 'admin' })) {
    await setupState.updateOne({ _id: registrationClosed._id }, { $setOnInsert: registrationClosed }, { upsert: true });
    throw new HttpError(409, 'An administrator account already exists. Admin registration is closed.');
  }

  let user;
  try {
    user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'admin' });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.role) {
      throw new HttpError(409, 'An administrator account already exists. Admin registration is closed.');
    }
    throw error;
  }
  await setupState.updateOne({ _id: registrationClosed._id }, { $setOnInsert: registrationClosed }, { upsert: true });
  res.status(201).json({ token: sign(user), user: pub(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash)))
    throw new HttpError(401, 'Incorrect email or password');
  if (!user.active) throw new HttpError(403, 'This account is deactivated');
  res.json({ token: sign(user), user: pub(user) });
});

exports.me = (req, res) => res.json({ user: pub(req.user) });

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  if (name) req.user.name = name;
  if (password) {
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    req.user.passwordHash = await bcrypt.hash(password, 10);
  }
  await req.user.save();
  res.json({ user: pub(req.user) });
});
