const Counter = require('../models/Counter');
const Token = require('../models/Token');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const q = require('../services/queue.service');
const { dayKey } = require('../utils/dates');

// Admin may act on any counter by passing counterId; staff can only use the counter assigned to them.
async function resolveCounter(req) {
  const c = req.user.role === 'admin' && req.body.counterId
    ? await Counter.findById(req.body.counterId)
    : await Counter.findOne({ staff: req.user._id });
  if (!c) throw new HttpError(404, 'No counter is assigned to you. Ask the administrator.');
  return c;
}

exports.queue = asyncHandler(async (req, res) => {
  const counter = req.user.role === 'admin' && req.query.counterId
    ? await Counter.findById(req.query.counterId) : await Counter.findOne({ staff: req.user._id });
  if (!counter) return res.json({ counter: null, waiting: [], current: null, completedToday: 0 });
  const [waiting, current, completedToday] = await Promise.all([
    Token.find({ status: { $in: ['WAITING', 'ON_HOLD', 'SKIPPED'] }, department: { $in: counter.departments } })
      .sort({ priority: -1, queuedAt: 1 }),
    Token.findOne({ counter: counter._id, occupying: true }),
    Token.countDocuments({ counter: counter._id, status: 'COMPLETED', dayKey: dayKey() }),
  ]);
  res.json({
    counter: { id: counter._id, name: counter.name, active: counter.active },
    waiting: await Promise.all(waiting.map(q.tokenView)),
    current: current ? await q.tokenView(current) : null,
    completedToday,
  });
});

exports.callNext = asyncHandler(async (req, res) => {
  const t = await q.callNext(await resolveCounter(req), req.user);
  res.json({ token: t, message: t ? t.allocationNote : 'The queue is empty.' });
});

// A staff member may only touch tokens that belong to their counter's departments.
const ACTIONS = { start: 'SERVING', complete: 'COMPLETED', skip: 'SKIPPED', 'no-show': 'NO_SHOW',
  recall: 'WAITING', hold: 'ON_HOLD', resume: 'WAITING' };

exports.action = asyncHandler(async (req, res) => {
  const to = ACTIONS[req.params.action];
  if (!to) throw new HttpError(400, 'Unknown action');
  const counter = await resolveCounter(req);
  const token = await Token.findById(req.params.id);
  if (!token) throw new HttpError(404, 'Token not found');
  const deptOk = counter.departments.some(d => String(d) === String(token.department));
  const ownsIt = token.counter && String(token.counter) === String(counter._id);
  if (!deptOk) throw new HttpError(403, 'This token belongs to another department');
  if (['SERVING', 'COMPLETED'].includes(to) && !ownsIt) throw new HttpError(403, 'This token is not at your counter');
  res.json(await q.transition(token._id, to, req.user, { counterId: counter._id }));
});

exports.autoCall = asyncHandler(async (req, res) => {
  const t = await q.autoCall(req.body.departmentId, req.user);
  res.json({ token: t, message: t ? t.allocationNote : 'The queue is empty.' });
});
