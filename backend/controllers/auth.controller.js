const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { createAdminAccount, isValidAdminRegistrationCode } = require('../services/adminRegistration.service');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone || '', smsOptIn: !!u.smsOptIn, role: u.role });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  // Role is always user on public registration. Administrators use the protected registration flow.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'user' });
  res.status(201).json({ token: sign(user), user: pub(user) });
});

exports.registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, registrationCode } = req.body;
  if (!password || password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  if (!process.env.ADMIN_REGISTRATION_CODE) throw new HttpError(503, 'Admin registration is not configured on the server.');
  if (!isValidAdminRegistrationCode(registrationCode)) throw new HttpError(403, 'Invalid administrator registration code.');

  const user = await createAdminAccount({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
  });
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
  const { name, password, phone, smsOptIn } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) {
    const normalizedPhone = String(phone).trim();
    if (normalizedPhone && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone))
      throw new HttpError(400, 'Phone number must use E.164 format, for example +14155552671');
    req.user.phone = normalizedPhone;
    if (!normalizedPhone && smsOptIn === undefined) req.user.smsOptIn = false;
  }
  if (smsOptIn !== undefined) {
    if (typeof smsOptIn !== 'boolean') throw new HttpError(400, 'SMS preference must be true or false');
    if (smsOptIn && !(phone === undefined ? req.user.phone : String(phone).trim()))
      throw new HttpError(400, 'Add a phone number before enabling SMS alerts');
    req.user.smsOptIn = smsOptIn;
  }
  if (password) {
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    req.user.passwordHash = await bcrypt.hash(password, 10);
  }
  await req.user.save();
  res.json({ user: pub(req.user) });
});
