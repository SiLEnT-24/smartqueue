require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const socket = require('./utils/socket');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

if (!process.env.JWT_SECRET) { console.error('JWT_SECRET missing. Copy .env.example to .env'); process.exit(1); }

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
socket.init(server);

connectDB().then(() => {
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`SmartQueue API on http://localhost:${port}`));
}).catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
