const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const { requireRole } = require('../middleware/auth');

test('account schema supports only user and admin roles', () => {
  assert.deepEqual(User.schema.path('role').enumValues, ['user', 'admin']);
  assert.equal(User.schema.path('role').defaultValue, 'user');
});

test('administrator routes reject users and accept administrators', () => {
  const requireAdmin = requireRole('admin');
  let userError;
  requireAdmin({ user: { role: 'user' } }, {}, (error) => { userError = error; });
  assert.equal(userError.status, 403);

  let adminNext = false;
  requireAdmin({ user: { role: 'admin' } }, {}, (error) => {
    assert.equal(error, undefined);
    adminNext = true;
  });
  assert.equal(adminNext, true);
});
