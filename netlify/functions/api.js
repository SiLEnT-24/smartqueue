// Runs the SmartQueue Express API as a Netlify Function. netlify.toml rewrites /api/* here.
const serverless = require('../../backend/node_modules/serverless-http');
const app = require('../../backend/app');
const connectDB = require('../../backend/config/db');

const PREFIX = '/.netlify/functions/api';
const run = serverless(app, {
  // Restore the /api prefix the Express routes expect, whichever path the rewrite delivers.
  request(req) { if (req.url.startsWith(PREFIX)) req.url = '/api' + req.url.slice(PREFIX.length); },
});
const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    console.error('MONGO_URI and JWT_SECRET must be set in the Netlify environment variables.');
    return json(503, { message: 'The server is not configured yet. Set MONGO_URI and JWT_SECRET in Netlify.' });
  }
  try { await connectDB(); } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    return json(503, { message: 'Cannot reach the database. Please try again shortly.' });
  }
  return run(event, context);
};
