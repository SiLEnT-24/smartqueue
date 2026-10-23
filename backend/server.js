require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const socket = require('./utils/socket');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

let dbConnection;
function connectToMongoDB() {
  if (!dbConnection) {
    dbConnection = connectDB().catch((error) => {
      dbConnection = null;
      throw error;
    });
  }
  return dbConnection;
}

app.use(async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set.');
    }
    await connectToMongoDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET missing. Copy .env.example to .env');
    process.exitCode = 1;
  } else {
    const server = http.createServer(app);
    socket.init(server);
    connectToMongoDB().then(() => {
      const port = process.env.PORT || 5000;
      server.listen(port, () => console.log(`SmartQueue API on http://localhost:${port}`));
    }).catch((error) => {
      console.error('Startup failed:', error.message);
      process.exitCode = 1;
    });
  }
}

module.exports = app;
