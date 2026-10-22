// Waiting time = people ahead x average service time / active counters  (rounded UP)
const Token = require('../models/Token');
const Counter = require('../models/Counter');
const { dayKey } = require('../utils/dates');

const MIN_SAMPLES = 5;   // need this many recent completions to trust live data
const SAMPLE_SIZE = 20;

function computeWait({ ahead, avgMinutes, activeCounters }) {
  const counters = Math.max(1, activeCounters);
  const minutes = ahead <= 0 ? 0 : Math.ceil((ahead * avgMinutes) / counters);
  return { minutes, label: minutes === 0 ? 'Your turn is next (~0 min)' : `~${minutes} min (approximate)` };
}

async function avgServiceMinutes(department) {
  const recent = await Token.find({
    department: department._id, status: 'COMPLETED', dayKey: dayKey(),
    startedAt: { $ne: null }, completedAt: { $ne: null },
  }).sort({ completedAt: -1 }).limit(SAMPLE_SIZE).select('startedAt completedAt').lean();
  if (recent.length >= MIN_SAMPLES) {
    const total = recent.reduce((s, t) => s + (t.completedAt - t.startedAt), 0);
    return { value: Math.max(0.5, total / recent.length / 60000), source: 'live' };
  }
  return { value: department.defaultServiceMinutes, source: 'default' };
}

const activeCounterCount = (departmentId) => Counter.countDocuments({ active: true, departments: departmentId });

module.exports = { computeWait, avgServiceMinutes, activeCounterCount, MIN_SAMPLES };
