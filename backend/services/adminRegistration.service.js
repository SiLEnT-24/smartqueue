const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { timingSafeEqual } = require('crypto');

const MAX_ADMINS = 5;
const COUNTER_ID = 'admin-registration-count';

async function ensureAdminCounter() {
  await User.init();
  const indexes = await User.collection.indexes();
  for (const index of indexes) {
    if (index.unique && index.key.role && index.partialFilterExpression?.role === 'admin') {
      try {
        await User.collection.dropIndex(index.name);
      } catch (error) {
        if (error.code !== 27) throw error;
      }
    }
  }

  const setupState = User.db.collection('setup_state');
  const adminCount = await User.countDocuments({ role: 'admin' });
  try {
    await setupState.updateOne(
      { _id: COUNTER_ID },
      { $setOnInsert: { count: adminCount } },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  return setupState;
}

async function reserveAdminSlot() {
  const setupState = await ensureAdminCounter();
  const result = await setupState.findOneAndUpdate(
    { _id: COUNTER_ID, count: { $lt: MAX_ADMINS } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' },
  );
  const reservation = result && Object.prototype.hasOwnProperty.call(result, 'value') ? result.value : result;
  if (!reservation) throw new HttpError(409, `The limit of ${MAX_ADMINS} administrator accounts has been reached.`);
  return setupState;
}

async function releaseAdminSlot(setupState) {
  await setupState.updateOne({ _id: COUNTER_ID, count: { $gt: 0 } }, { $inc: { count: -1 } });
}

async function createAdminAccount(fields) {
  const setupState = await reserveAdminSlot();
  try {
    return await User.create({ ...fields, role: 'admin' });
  } catch (error) {
    try {
      await releaseAdminSlot(setupState);
    } catch (releaseError) {
      console.error('Could not release administrator registration slot:', releaseError.message);
    }
    throw error;
  }
}

function isValidAdminRegistrationCode(value) {
  const expected = process.env.ADMIN_REGISTRATION_CODE;
  if (!expected || typeof value !== 'string') return false;
  const actualBuffer = Buffer.from(value.trim());
  const expectedBuffer = Buffer.from(expected.trim());
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

module.exports = {
  MAX_ADMINS,
  createAdminAccount,
  ensureAdminCounter,
  isValidAdminRegistrationCode,
  releaseAdminSlot,
  reserveAdminSlot,
};
