const mongoose = require('mongoose');
const Token = require('../models/Token');
const Counter = require('../models/Counter');
const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const { dayKey } = require('../utils/dates');

const tz = () => process.env.APP_TZ || 'Asia/Kolkata';
const num = (v) => (v == null ? null : Math.round(v * 10) / 10);

// Every figure below is calculated from stored Token documents. Nothing is invented.
function buildMatch(q) {
  const from = q.from || dayKey(), to = q.to || from;
  const m = { dayKey: { $gte: from, $lte: to } };
  if (q.department && mongoose.isValidObjectId(q.department)) m.department = new mongoose.Types.ObjectId(q.department);
  return { match: m, from, to };
}

async function getOverview(query) {
  const { match, from, to } = buildMatch(query);
  const [statusAgg, waitAgg, svcAgg, hourly, perCounter, waitingNow] = await Promise.all([
    Token.aggregate([{ $match: match }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Token.aggregate([{ $match: { ...match, calledAt: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: { $subtract: ['$calledAt', '$createdAt'] } } } }]),
    Token.aggregate([{ $match: { ...match, status: 'COMPLETED', startedAt: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: { $subtract: ['$completedAt', '$startedAt'] } } } }]),
    Token.aggregate([{ $match: match },
      { $group: { _id: { $hour: { date: '$createdAt', timezone: tz() } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Token.aggregate([{ $match: { ...match, status: 'COMPLETED', counter: { $ne: null }, startedAt: { $ne: null } } },
      { $group: { _id: '$counter', served: { $sum: 1 }, busyMs: { $sum: { $subtract: ['$completedAt', '$startedAt'] } } } }]),
    Token.aggregate([{ $match: { status: 'WAITING' } }, { $group: { _id: '$department', n: { $sum: 1 } } }]),
  ]);
  const counts = Object.fromEntries(statusAgg.map(s => [s._id, s.n]));
  const total = statusAgg.reduce((s, x) => s + x.n, 0);
  const [counters, depts] = await Promise.all([Counter.find().select('name'), Department.find().select('name code')]);
  const cName = Object.fromEntries(counters.map(c => [String(c._id), c.name]));
  const waitMap = Object.fromEntries(waitingNow.map(w => [String(w._id), w.n]));
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}:00`, tokens: (hourly.find(x => x._id === h) || {}).n || 0 }));
  return {
    range: { from, to },
    totals: { total, waiting: counts.WAITING || 0, serving: (counts.SERVING || 0) + (counts.CALLED || 0),
      completed: counts.COMPLETED || 0, noShow: counts.NO_SHOW || 0, cancelled: counts.CANCELLED || 0, skipped: counts.SKIPPED || 0 },
    avgWaitMin: waitAgg[0] ? num(waitAgg[0].avg / 60000) : null,
    avgServiceMin: svcAgg[0] ? num(svcAgg[0].avg / 60000) : null,
    departmentQueues: depts.map(d => ({ name: d.name, code: d.code, waiting: waitMap[String(d._id)] || 0 })),
    hourly: hours.filter(h => h.tokens > 0 || (Number(h.hour.slice(0, 2)) >= 8 && Number(h.hour.slice(0, 2)) <= 18)),
    counterUtilization: perCounter.map(c => ({ counter: cName[String(c._id)] || 'Unknown', served: c.served, busyMinutes: num(c.busyMs / 60000) })),
  };
}

exports.overview = asyncHandler(async (req, res) => {
  res.json(await getOverview(req.query));
});

const { createAnalyticsSummary } = require('../services/analyticsSummary.service');
exports.summary = asyncHandler(async (req, res) => {
  res.json({ summary: await createAnalyticsSummary(await getOverview(req.query)) });
});

const esc = (v) => { const s = v == null ? '' : String(v); return /^[=+\-@]/.test(s) ? `"'${s.replace(/"/g, '""')}"` : `"${s.replace(/"/g, '""')}"`; };

// CSV export (values starting with = + - @ are neutralised to stop spreadsheet formula injection)
exports.exportCsv = asyncHandler(async (req, res) => {
  const { match, from, to } = buildMatch(req.query);
  const tokens = await Token.find(match).sort('createdAt').populate('department', 'name').populate('counter', 'name').populate('user', 'name').lean();
  const iso = (d) => (d ? new Date(d).toISOString() : '');
  const header = ['Token', 'Department', 'Student', 'Status', 'Priority', 'Counter', 'Created', 'Called', 'Service started', 'Completed', 'Wait (min)', 'Service (min)'];
  const rows = tokens.map(t => [t.tokenNumber, t.department && t.department.name, t.user && t.user.name, t.status, t.priority ? 'yes' : 'no',
    t.counter && t.counter.name, iso(t.createdAt), iso(t.calledAt), iso(t.startedAt), iso(t.completedAt),
    t.calledAt ? num((t.calledAt - t.createdAt) / 60000) : '', t.startedAt && t.completedAt ? num((t.completedAt - t.startedAt) / 60000) : '']);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="smartqueue-report-${from}_to_${to}.csv"`);
  res.send('\uFEFF' + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n'));
});
