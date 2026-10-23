const mongoose = require('mongoose');
const User = require('../models/User');
const Counter = require('../models/Counter');

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set. Copy .env.example to .env');
  await mongoose.connect(uri);
  const migration = await User.collection.updateMany(
    { role: { $in: ['student', 'staff'] } },
    { $set: { role: 'user' } },
  );
  await Counter.collection.updateMany({}, { $unset: { staff: '' } });
  if (migration.modifiedCount) console.log(`Migrated ${migration.modifiedCount} student/staff account(s) to user role`);
  console.log('MongoDB connected');
};
