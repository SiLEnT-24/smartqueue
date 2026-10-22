const Token = require('../models/Token');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const q = require('../services/queue.service');

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await q.generateToken(req.user, req.body.departmentId));
});
exports.cancel = asyncHandler(async (req, res) => res.json(await q.cancelToken(req.user, req.params.id)));

exports.mine = asyncHandler(async (req, res) => {
  const tokens = await Token.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(await Promise.all(tokens.map(q.tokenView)));
});
exports.getOne = asyncHandler(async (req, res) => {
  const t = await Token.findById(req.params.id);
  if (!t) throw new HttpError(404, 'Token not found');
  if (String(t.user) !== String(req.user._id) && req.user.role === 'student') throw new HttpError(403, 'Not your token');
  res.json(await q.tokenView(t));
});
exports.listAll = asyncHandler(async (req, res) => {
  const f = {};
  if (req.query.status) f.status = req.query.status;
  if (req.query.department) f.department = req.query.department;
  if (req.query.day) f.dayKey = req.query.day;
  const tokens = await Token.find(f).sort({ createdAt: -1 }).limit(200);
  res.json(await Promise.all(tokens.map(q.tokenView)));
});
exports.setPriority = asyncHandler(async (req, res) =>
  res.json(await q.setPriority(req.user, req.params.id, req.body.value, req.body.reason)));

// Public endpoints
exports.departmentStatus = asyncHandler(async (req, res) => res.json(await q.departmentStatus(req.params.departmentId)));
exports.display = asyncHandler(async (req, res) => res.json(await q.displayData()));
