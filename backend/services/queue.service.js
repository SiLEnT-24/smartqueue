const Token = require('../models/Token');
const Counter = require('../models/Counter');
const Department = require('../models/Department');
const DailySequence = require('../models/DailySequence');
const AuditLog = require('../models/AuditLog');
const HttpError = require('../utils/httpError');
const { dayKey } = require('../utils/dates');
const { emitTo } = require('../utils/socket');
const est = require('./estimate.service');
const { sendTokenCreatedEmail, sendTokenCreatedSms } = require('./sms.service');

// Allowed lifecycle moves. Anything not listed here is rejected by the server.
const TRANSITIONS = {
  WAITING: ['CALLED', 'ON_HOLD', 'CANCELLED'],
  CALLED: ['SERVING', 'SKIPPED', 'NO_SHOW', 'ON_HOLD', 'CANCELLED'],
  SERVING: ['COMPLETED'],
  SKIPPED: ['WAITING', 'NO_SHOW'],
  ON_HOLD: ['WAITING', 'CANCELLED'],
  COMPLETED: [], CANCELLED: [], NO_SHOW: [],
};
const INACTIVE = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

const audit = (user, action, extra = {}) =>
  AuditLog.create({ user: user && user._id, action, ...extra }).catch(() => {});

// ---------- views ----------
// Tokens ahead of `t` = priority tokens + older normal tokens (or older priority tokens if t is priority)
function aheadFilter(t) {
  const base = { department: t.department, status: 'WAITING' };
  return t.priority
    ? { ...base, priority: true, queuedAt: { $lt: t.queuedAt } }
    : { ...base, $or: [{ priority: true }, { priority: false, queuedAt: { $lt: t.queuedAt } }] };
}

async function tokenView(t) {
  const dept = await Department.findById(t.department);
  let ahead = 0, estimate = { minutes: 0, label: '' };
  if (t.status === 'WAITING') {
    ahead = await Token.countDocuments(aheadFilter(t));
    const avg = await est.avgServiceMinutes(dept);
    const counters = await est.activeCounterCount(dept._id);
    estimate = est.computeWait({ ahead, avgMinutes: avg.value, activeCounters: counters });
  }
  const counter = t.counter ? await Counter.findById(t.counter).select('name') : null;
  return {
    id: t._id, tokenNumber: t.tokenNumber, status: t.status, priority: t.priority,
    department: { id: dept._id, name: dept.name, code: dept.code },
    peopleAhead: ahead, position: t.status === 'WAITING' ? ahead + 1 : null,
    estimatedWaitMin: estimate.minutes, estimatedWaitLabel: estimate.label,
    counter: counter ? counter.name : null, allocationNote: t.allocationNote,
    createdAt: t.createdAt, calledAt: t.calledAt, startedAt: t.startedAt, completedAt: t.completedAt,
  };
}

async function departmentStatus(depId) {
  const dept = await Department.findById(depId);
  const [serving, next, waitingCount, counters, avg] = await Promise.all([
    Token.find({ department: depId, occupying: true }).populate('counter', 'name').lean(),
    Token.find({ department: depId, status: 'WAITING' }).sort({ priority: -1, queuedAt: 1 }).limit(5).select('tokenNumber priority').lean(),
    Token.countDocuments({ department: depId, status: 'WAITING' }),
    est.activeCounterCount(depId),
    est.avgServiceMinutes(dept),
  ]);
  const wait = est.computeWait({ ahead: waitingCount, avgMinutes: avg.value, activeCounters: counters });
  return {
    department: { id: dept._id, name: dept.name, code: dept.code },
    nowServing: serving.map(t => ({ tokenNumber: t.tokenNumber, status: t.status, counter: t.counter && t.counter.name })),
    next, waitingCount, activeCounters: counters,
    avgServiceMinutes: Math.round(avg.value * 10) / 10, avgSource: avg.source,
    queueWaitMin: wait.minutes,
  };
}

async function displayData() {
  const depts = await Department.find({ active: true }).sort('name');
  const queues = await Promise.all(depts.map(d => departmentStatus(d._id)));
  const recent = await Token.find({ dayKey: dayKey(), status: 'COMPLETED' })
    .sort({ completedAt: -1 }).limit(8).populate('counter', 'name').select('tokenNumber counter').lean();
  return { queues, recentlyCompleted: recent.map(t => ({ tokenNumber: t.tokenNumber, counter: t.counter && t.counter.name })) };
}

// Push fresh state to every connected screen that cares
async function broadcast(depId) {
  try {
    const status = await departmentStatus(depId);
    emitTo(`dept:${depId}`, 'queue:update', status);
    emitTo('staff', 'queue:update', status);
    emitTo('display', 'display:update', await displayData());
    const waiting = await Token.find({ department: depId, status: 'WAITING' });
    for (const t of waiting) {
      const v = await tokenView(t);
      emitTo(`user:${t.user}`, 'token:update', v);
      if (v.peopleAhead <= 2) emitTo(`user:${t.user}`, 'notify',
        { type: 'APPROACHING', message: `Your turn is near: ${v.peopleAhead} ahead of ${t.tokenNumber}.` });
    }
  } catch (e) { console.error('broadcast failed:', e.message); }
}

async function notifyUser(token, type, message) {
  emitTo(`user:${token.user}`, 'token:update', await tokenView(token));
  emitTo(`user:${token.user}`, 'notify', { type, message });
}

// ---------- token creation ----------
async function nextSequence(depId, day, retry = true) {
  try {
    return await DailySequence.findOneAndUpdate({ dayKey: day, department: depId },
      { $inc: { seq: 1 } }, { upsert: true, new: true });
  } catch (e) {
    if (e.code === 11000 && retry) return nextSequence(depId, day, false); // two first-of-day requests raced
    throw e;
  }
}

async function generateToken(user, departmentId) {
  const dept = await Department.findById(departmentId);
  if (!dept || !dept.active) throw new HttpError(400, 'This service is not available right now');
  if (!(await est.activeCounterCount(dept._id))) throw new HttpError(409, 'No counter is open for this service yet');
  const existing = await Token.findOne({ user: user._id, department: dept._id, active: true });
  if (existing) throw new HttpError(409, `You already have an active token (${existing.tokenNumber}) for ${dept.name}`);

  const day = dayKey();
  const { seq } = await nextSequence(dept._id, day);   // atomic $inc => no two users get the same number
  let token;
  try {
    token = await Token.create({
      tokenNumber: `${dept.code}-${String(seq).padStart(3, '0')}`, dayKey: day, seq,
      user: user._id, department: dept._id,           // priority is never read from the request
    });
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, 'You already have an active token for this service');
    throw e;
  }
  const view = await tokenView(token);
  token.estimatedWaitMin = view.estimatedWaitMin;
  await token.save();
  await audit(user, 'TOKEN_CREATED', { token: token._id });
  await notifyUser(token, 'GENERATED', `Token ${token.tokenNumber} generated. Estimated wait ${view.estimatedWaitLabel}.`);
  const notifications = {};
  try {
    const emailSent = await sendTokenCreatedEmail(user.email, user.name, view);
    if (emailSent !== null) notifications.emailSent = emailSent;
  } catch (error) {
    console.error(`Email notification failed for token ${token._id}:`, error.message);
    notifications.emailSent = false;
  }
  if (user.smsOptIn && user.phone) {
    try {
      const smsSent = await sendTokenCreatedSms(user.phone, view);
      if (smsSent !== null) notifications.smsSent = smsSent;
    } catch (error) {
      console.error(`SMS notification failed for token ${token._id}:`, error.message);
      notifications.smsSent = false;
    }
  }
  await broadcast(dept._id);
  return { ...view, ...notifications };
}

// ---------- state machine ----------
function buildUpdate(to, counterId) {
  const now = new Date();
  const u = { status: to, active: !INACTIVE.includes(to), occupying: ['CALLED', 'SERVING'].includes(to) };
  if (to === 'CALLED') { u.calledAt = now; u.counter = counterId; }
  if (to === 'SERVING') u.startedAt = now;
  if (to === 'COMPLETED') u.completedAt = now;
  if (to === 'WAITING') { u.queuedAt = now; u.counter = null; u.calledAt = null; }
  return u;
}

// Atomic: only succeeds if the token is STILL in the status we read (prevents double actions / races).
async function transition(tokenId, to, actor, { counterId = null, note = '' } = {}) {
  const token = await Token.findById(tokenId);
  if (!token) throw new HttpError(404, 'Token not found');
  if (!TRANSITIONS[token.status].includes(to))
    throw new HttpError(409, `Cannot change a ${token.status} token to ${to}`);
  const update = buildUpdate(to, counterId);
  if (note) update.allocationNote = note;
  let updated;
  try {
    updated = await Token.findOneAndUpdate({ _id: tokenId, status: token.status }, { $set: update }, { new: true });
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, 'That counter is already serving another token');
    throw e;
  }
  if (!updated) throw new HttpError(409, 'Token was changed by someone else. Refresh and try again.');
  await audit(actor, `TOKEN_${to}`, { token: updated._id, counter: updated.counter || undefined, details: `${token.status} -> ${to}` });
  const msgs = {
    CALLED: `${updated.tokenNumber} is called. Please go to the counter.`,
    SERVING: `Service started for ${updated.tokenNumber}.`,
    COMPLETED: `${updated.tokenNumber} completed. Please leave feedback!`,
    SKIPPED: `${updated.tokenNumber} was skipped.`, NO_SHOW: `${updated.tokenNumber} marked no-show.`,
    CANCELLED: `${updated.tokenNumber} cancelled.`, ON_HOLD: `${updated.tokenNumber} is on hold.`,
    WAITING: `${updated.tokenNumber} is back in the queue.`,
  };
  await notifyUser(updated, to, msgs[to]);
  await broadcast(updated.department);
  return tokenView(updated);
}

async function cancelToken(user, tokenId) {
  const t = await Token.findById(tokenId);
  if (!t) throw new HttpError(404, 'Token not found');
  if (String(t.user) !== String(user._id) && user.role !== 'admin')
    throw new HttpError(403, 'You can only cancel your own token');
  return transition(tokenId, 'CANCELLED', user);   // SERVING/COMPLETED are rejected by TRANSITIONS
}

// ---------- counter allocation ----------
const counterLoad = (counterId) => Token.countDocuments({ counter: counterId, status: 'COMPLETED', dayKey: dayKey() });
const isBusy = async (counterId) => !!(await Token.exists({ counter: counterId, occupying: true }));

// Rules: active only -> serves the department -> currently free -> lowest workload wins.
async function suggestCounter(departmentId) {
  const counters = await Counter.find({ active: true, departments: departmentId });
  const free = [];
  for (const c of counters) if (!(await isBusy(c._id))) free.push({ counter: c, load: await counterLoad(c._id) });
  if (!free.length) return null;
  free.sort((a, b) => a.load - b.load);
  return free[0];
}

async function callNext(counter, actor) {
  if (!counter.active) throw new HttpError(409, 'This counter is not active');
  if (await isBusy(counter._id)) throw new HttpError(409, 'Finish the current token before calling the next one');
  for (let i = 0; i < 5; i++) {
    // Priority tokens first, then strict FIFO by queuedAt
    const cand = await Token.findOne({ status: 'WAITING', department: { $in: counter.departments } })
      .sort({ priority: -1, queuedAt: 1 });
    if (!cand) return null;
    const load = await counterLoad(counter._id);
    const note = `${counter.name} was chosen because it is active, serves this department, is free, ` +
      `and has completed ${load} token(s) today. ` + (cand.priority ? 'This token has authorised priority.' : 'This is the oldest waiting token (FIFO).');
    try { return await transition(cand._id, 'CALLED', actor, { counterId: counter._id, note }); }
    catch (e) { if (e.status === 409 && /changed by someone/.test(e.message)) continue; throw e; }
  }
  return null;
}

// Let the system choose the best free counter for a department
async function autoCall(departmentId, actor) {
  const pick = await suggestCounter(departmentId);
  if (!pick) throw new HttpError(409, 'No free active counter for this department');
  return callNext(pick.counter, actor);
}

// ---------- priority (admin only, reason required, audited) ----------
async function setPriority(admin, tokenId, value, reason) {
  if (!reason || reason.trim().length < 3) throw new HttpError(400, 'A reason is required');
  const t = await Token.findById(tokenId).populate('department');
  if (!t) throw new HttpError(404, 'Token not found');
  if (!t.department.priorityEnabled) throw new HttpError(409, 'Priority service is not enabled for this department');
  if (t.status !== 'WAITING') throw new HttpError(409, 'Only waiting tokens can change priority');
  t.priority = !!value;
  t.priorityHistory.push({ by: admin._id, reason: reason.trim(), value: !!value, at: new Date() });
  await t.save();
  await audit(admin, value ? 'PRIORITY_GRANTED' : 'PRIORITY_REMOVED', { token: t._id, details: reason.trim() });
  await broadcast(t.department._id);
  return tokenView(t);
}

module.exports = { generateToken, cancelToken, transition, callNext, autoCall, suggestCounter,
  setPriority, tokenView, departmentStatus, displayData, broadcast, TRANSITIONS };
