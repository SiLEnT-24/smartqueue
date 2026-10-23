const test = require('node:test');
const assert = require('node:assert');
const { ruleBased } = require('../services/chatbot.service');
test('chatbot rules: answers token status and wait from live data', () => {
  const ctx = { departments: [{ name: 'Library', code: 'LB', waiting: 4, activeCounters: 2, approxWaitMin: 6, nowServing: ['LB-003'] }],
    myTokens: [{ tokenNumber: 'LB-007', department: 'Library', status: 'WAITING', position: 3, peopleAhead: 2, approxWaitMin: 4, counter: null }] };
  assert.match(ruleBased('What is my token status?', ctx), /LB-007.*position 3.*2 ahead/);
  assert.match(ruleBased('how long is the wait', ctx), /2 ahead.*approximate/);
  assert.match(ruleBased('which counters are open?', ctx), /Library: 2 counter/);
});
test('chatbot rules: handles no token, empty data and unknown questions', () => {
  assert.match(ruleBased('my token', { departments: [], myTokens: [] }), /no active token/);
  assert.match(ruleBased('how long', { departments: [], myTokens: [] }), /No services/);
  assert.match(ruleBased('tell me a joke', { departments: [], myTokens: [] }), /I don't know/);
});

test('assistant built-in answers use only supplied context and never claim to act', () => {
  const { ruleBased } = require('../services/chatbot.service');
  const ctx = { myTokens: [{ tokenNumber: 'EX-004', department: 'Examination Cell', status: 'WAITING', position: 4, peopleAhead: 3, approxWaitMin: 8, counter: null }],
    departments: [{ name: 'Library', code: 'LB', waiting: 2, activeCounters: 1, approxWaitMin: 3, nowServing: [] }] };
  assert.match(ruleBased('what is my token status', ctx, 'student'), /EX-004.*3 ahead/s);
  assert.match(ruleBased('how do I cancel', ctx, 'student'), /Cancel token/);
  assert.match(ruleBased('how do I rate a token', ctx, 'student'), /star rating from 1 to 5/);
  assert.match(ruleBased('how do I turn on alerts', ctx, 'student'), /browser alerts.*Profile/s);
  assert.match(ruleBased('how do I turn on alerts', ctx, 'student'), /cannot send email or SMS/);
  assert.match(ruleBased('how long is the wait', { myTokens: [], departments: ctx.departments }, 'student'), /Library: 2 waiting/);
  assert.match(ruleBased('zzzz qqqq', ctx, 'student'), /I don't know/);
});
