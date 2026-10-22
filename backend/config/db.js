const mongoose = require('mongoose');
// Reuses one connection per process; serverless invocations share it while the instance stays warm.
let pending = null;
module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set. Copy .env.example to .env');
  if (mongoose.connection.readyState === 1) return;
  if (!pending) {
    pending = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
      .then(() => console.log('MongoDB connected'))
      .catch((e) => { pending = null; throw e; });
  }
  await pending;
};
