const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
let io = null;

exports.init = (httpServer) => {
  io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL || '*' } });
  io.on('connection', (socket) => {
    // Auth is optional: the public display screen connects without a token.
    try {
      const t = socket.handshake.auth && socket.handshake.auth.token;
      if (t) {
        const p = jwt.verify(t, process.env.JWT_SECRET);
        socket.join(`user:${p.id}`);
        if (p.role === 'admin') socket.join('queue-managers');
      }
    } catch (_) { /* anonymous socket */ }
    socket.on('join:display', () => socket.join('display'));
    socket.on('join:dept', (id) => socket.join(`dept:${id}`));
  });
  return io;
};
exports.emitTo = (room, event, payload) => { if (io) io.to(room).emit(event, payload); };
