const Feedback = require('../models/Feedback');
const Token = require('../models/Token');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const q = require('../services/queue.service');

exports.create = asyncHandler(async (req, res) => {
  const { tokenId, comment } = req.body;
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Rating must be 1 to 5');
  const t = await Token.findById(tokenId);
  if (!t || String(t.user) !== String(req.user._id)) throw new HttpError(404, 'Token not found');
  if (t.status !== 'COMPLETED') throw new HttpError(409, 'You can rate a token only after service is completed');
  const f = await Feedback.create({ token: t._id, user: req.user._id, department: t.department, rating, comment: String(comment || '').slice(0, 500) });
  res.status(201).json(f);
});

// Student: completed tokens still waiting for feedback
exports.pending = asyncHandler(async (req, res) => {
  const done = await Feedback.find({ user: req.user._id }).distinct('token');
  const tokens = await Token.find({ user: req.user._id, status: 'COMPLETED', _id: { $nin: done } }).sort('-completedAt').limit(20);
  res.json(await Promise.all(tokens.map(q.tokenView)));
});

// Admin: summary + latest comments
exports.summary = asyncHandler(async (req, res) => {
  const [overall] = await Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  const byDept = await Feedback.aggregate([
    { $group: { _id: '$department', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'd' } },
    { $project: { name: { $arrayElemAt: ['$d.name', 0] }, avg: { $round: ['$avg', 2] }, count: 1 } },
  ]);
  const latest = await Feedback.find().sort('-createdAt').limit(20).populate('token', 'tokenNumber').populate('department', 'name');
  res.json({ average: overall ? Math.round(overall.avg * 100) / 100 : null, count: overall ? overall.count : 0, byDepartment: byDept, latest });
});
