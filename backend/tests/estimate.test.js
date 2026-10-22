const test = require('node:test');
const assert = require('node:assert');
const { computeWait } = require('../services/estimate.service');
const { TRANSITIONS } = require('../services/queue.service');

test('spec example: 12 ahead, 4 min, 3 counters => 16 min', () => {
  assert.strictEqual(computeWait({ ahead: 12, avgMinutes: 4, activeCounters: 3 }).minutes, 16);
});
test('rounds up, never divides by zero', () => {
  assert.strictEqual(computeWait({ ahead: 5, avgMinutes: 3, activeCounters: 2 }).minutes, 8);
  assert.strictEqual(computeWait({ ahead: 3, avgMinutes: 4, activeCounters: 0 }).minutes, 12);
  assert.strictEqual(computeWait({ ahead: 0, avgMinutes: 4, activeCounters: 2 }).minutes, 0);
});
test('completed/cancelled/no-show tokens can never re-enter the queue', () => {
  for (const s of ['COMPLETED', 'CANCELLED', 'NO_SHOW']) assert.deepStrictEqual(TRANSITIONS[s], []);
});
test('only SERVING can complete; WAITING cannot jump to SERVING', () => {
  assert.ok(!TRANSITIONS.WAITING.includes('SERVING'));
  assert.ok(!TRANSITIONS.WAITING.includes('COMPLETED'));
  assert.ok(TRANSITIONS.SERVING.includes('COMPLETED'));
});
