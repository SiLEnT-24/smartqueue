const test = require('node:test');
const assert = require('node:assert/strict');
const { createAnalyticsSummary, summaryMetrics } = require('../services/analyticsSummary.service');
const { buildTokenCreatedMessage, sendTokenCreatedEmail, sendTokenCreatedSms } = require('../services/sms.service');
const { MAX_ADMINS, isValidAdminRegistrationCode } = require('../services/adminRegistration.service');

test('AI summary input contains aggregate analytics only', () => {
  const analytics = {
    range: { from: '2026-10-22', to: '2026-10-22' },
    totals: { total: 12, waiting: 4, completed: 8 },
    avgWaitMin: 5.5,
    avgServiceMin: 3,
    departmentQueues: [{ name: 'Admissions', code: 'AD', waiting: 4 }],
    hourly: [{ hour: '09:00', tokens: 7 }, { hour: '10:00', tokens: 5 }],
    users: [{ email: 'private@example.com' }],
  };

  assert.deepStrictEqual(summaryMetrics(analytics), {
    range: analytics.range,
    totals: analytics.totals,
    averageWaitMinutes: 5.5,
    averageServiceMinutes: 3,
    departmentQueues: analytics.departmentQueues,
    busiestHours: analytics.hourly,
  });
});

test('SMS body includes the token, department, and estimated wait', () => {
  assert.strictEqual(buildTokenCreatedMessage({
    tokenNumber: 'AD-012',
    department: { name: 'Admissions' },
    estimatedWaitLabel: 'about 10 minutes',
  }), 'SmartQueue: token AD-012 created for Admissions. Estimated wait: about 10 minutes.');
});

test('admin registration requires the configured shared code and is capped at five admins', () => {
  const oldCode = process.env.ADMIN_REGISTRATION_CODE;
  process.env.ADMIN_REGISTRATION_CODE = 'private-registration-code';
  try {
    assert.strictEqual(MAX_ADMINS, 5);
    assert.strictEqual(isValidAdminRegistrationCode('private-registration-code'), true);
    assert.strictEqual(isValidAdminRegistrationCode('wrong-registration-code'), false);
    assert.strictEqual(isValidAdminRegistrationCode(undefined), false);
  } finally {
    if (oldCode === undefined) delete process.env.ADMIN_REGISTRATION_CODE;
    else process.env.ADMIN_REGISTRATION_CODE = oldCode;
  }
});

  test('OpenRouter summary uses server credentials and sends only aggregate metrics', async () => {
    const oldFetch = global.fetch;
    const oldKey = process.env.OPENROUTER_API_KEY;
    const oldModel = process.env.OPENROUTER_MODEL;
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    process.env.OPENROUTER_MODEL = 'test-model';
    let request;
    global.fetch = async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Queue volume is steady.' } }] }) };
    };
    try {
      const result = await createAnalyticsSummary({
        range: { from: '2026-10-22', to: '2026-10-22' },
        totals: { total: 0 },
        avgWaitMin: null,
        avgServiceMin: null,
        departmentQueues: [],
        hourly: [],
        users: [{ email: 'private@example.com' }],
      });
      const body = JSON.parse(request.options.body);
      assert.strictEqual(result, 'Queue volume is steady.');
      assert.strictEqual(request.url, 'https://openrouter.ai/api/v1/chat/completions');
      assert.strictEqual(request.options.headers.authorization, 'Bearer test-api-key');
      assert.strictEqual(body.model, 'test-model');
      assert.ok(!request.options.body.includes('private@example.com'));
    } finally {
      global.fetch = oldFetch;
      if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = oldKey;
      if (oldModel === undefined) delete process.env.OPENROUTER_MODEL;
      else process.env.OPENROUTER_MODEL = oldModel;
    }
  });

  test('Brevo email uses the configured sender and account email', async () => {
    const oldFetch = global.fetch;
    const oldEnv = Object.fromEntries(['BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'BREVO_SENDER_NAME', 'BREVO_SMS_SENDER'].map((key) => [key, process.env[key]]));
    process.env.BREVO_API_KEY = 'test-api-key';
    process.env.BREVO_SENDER_EMAIL = 'verified@example.com';
    process.env.BREVO_SENDER_NAME = 'SmartQueue';
    let request;
    global.fetch = async (url, options) => {
      request = { url, options };
      return { ok: true };
    };
    try {
      assert.strictEqual(await sendTokenCreatedEmail('user@example.com', 'User', {
        tokenNumber: 'AD-012',
        department: { name: '<Admissions>' },
        estimatedWaitLabel: 'about 10 minutes',
      }), true);
      assert.strictEqual(request.url, 'https://api.brevo.com/v3/smtp/email');
      assert.strictEqual(request.options.headers['api-key'], 'test-api-key');
      const body = JSON.parse(request.options.body);
      assert.deepStrictEqual(body.sender, { email: 'verified@example.com', name: 'SmartQueue' });
      assert.deepStrictEqual(body.to, [{ email: 'user@example.com', name: 'User' }]);
      assert.ok(body.htmlContent.includes('&lt;Admissions&gt;'));
    } finally {
      global.fetch = oldFetch;
      for (const [key, value] of Object.entries(oldEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  test('Brevo SMS uses the configured sender and opted-in profile phone', async () => {
    const oldFetch = global.fetch;
    const oldEnv = Object.fromEntries(['BREVO_API_KEY', 'BREVO_SMS_SENDER'].map((key) => [key, process.env[key]]));
    process.env.BREVO_API_KEY = 'test-api-key';
    process.env.BREVO_SMS_SENDER = 'SmartQ';
    let request;
    global.fetch = async (url, options) => {
      request = { url, options };
      return { ok: true };
    };
    try {
      assert.strictEqual(await sendTokenCreatedSms('+14155552671', {
        tokenNumber: 'AD-012',
        department: { name: 'Admissions' },
        estimatedWaitLabel: 'about 10 minutes',
      }), true);
      assert.strictEqual(request.url, 'https://api.brevo.com/v3/transactionalSMS/sms');
      assert.strictEqual(request.options.headers['api-key'], 'test-api-key');
      assert.deepStrictEqual(JSON.parse(request.options.body), {
        sender: 'SmartQ',
        recipient: '+14155552671',
        content: 'SmartQueue: token AD-012 created for Admissions. Estimated wait: about 10 minutes.',
        type: 'transactional',
      });
    } finally {
      global.fetch = oldFetch;
      for (const [key, value] of Object.entries(oldEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
