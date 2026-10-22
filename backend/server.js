require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const socket = require('./utils/socket');

if (!process.env.JWT_SECRET) { console.error('JWT_SECRET missing. Copy .env.example to .env'); process.exit(1); }

const app = require('./app');
const server = http.createServer(app);
socket.init(server);

connectDB().then(() => {
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`SmartQueue API on http://localhost:${port}`));
}).catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
