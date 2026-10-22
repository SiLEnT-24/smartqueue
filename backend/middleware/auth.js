const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

exports.protect = asyncHandler(async (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw new HttpError(401, 'Please log in first');
  let payload;
  try { payload = jwt.verify(h.slice(7), process.env.JWT_SECRET); }
  catch { throw new HttpError(401, 'Session expired. Please log in again'); }
  const user = await User.findById(payload.id);
  if (!user || !user.active) throw new HttpError(401, 'Account not found or deactivated');
  req.user = user;
  next();
});

// Role check always uses the role stored in the DB, never a value sent by the client.
exports.requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, 'You are not allowed to do this'));
