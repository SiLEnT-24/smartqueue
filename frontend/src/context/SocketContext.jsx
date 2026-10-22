import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, SOCKET_URL, getToken } from '../api';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useSocket = () => useContext(Ctx);

// Real-time pushes need a long-running Socket.io server (local dev, or VITE_SOCKET_URL).
// Serverless deploys fall back to polling the REST API with the same event names.
const USE_SOCKET = import.meta.env.DEV || Boolean(SOCKET_URL);
const POLL_MS = 5000;

// Socket-shaped emitter: on/off/emit like socket.io, but fed by periodic API reads.
// Events only fire when the payload changed, so handlers behave as they do with pushes.
function createPollingSocket(user) {
  const handlers = {}; const depts = new Set(); const last = {}; const lastStatus = {};
  let display = false; let timer = null; let stopped = false;
  const has = (e) => handlers[e] && handlers[e].size > 0;
  const fire = (e, key, payload) => {
    const sig = JSON.stringify(payload);
    if (last[key] === sig) return;
    const first = last[key] === undefined; last[key] = sig;
    if (!first || e === 'display:update') (handlers[e] || []).forEach((h) => h(payload));
  };
  const tick = async () => {
    const jobs = [];
    if (display && has('display:update')) jobs.push(api.get('/queue/display').then((d) => fire('display:update', 'display', d)));
    if (has('queue:update')) {
      // Staff and admins hear every department, as they do in the socket "staff" room.
      const ids = new Set(depts);
      if (user && user.role !== 'student') (await api.get('/departments').catch(() => [])).forEach((d) => ids.add(d._id));
      ids.forEach((id) => jobs.push(api.get(`/queue/status/${id}`).then((s) => fire('queue:update', `q:${id}`, s))));
    }
    if (user && user.role === 'student' && (has('token:update') || has('notify'))) {
      jobs.push(api.get('/tokens/mine').then((list) => list.forEach((t) => {
        const prev = lastStatus[t.id]; lastStatus[t.id] = t.status;
        fire('token:update', `t:${t.id}`, t);
        if (prev && prev !== t.status) (handlers.notify || []).forEach((h) => h({ type: t.status, message: `Token ${t.tokenNumber} is now ${t.status.replace('_', ' ').toLowerCase()}.` }));
      })));
    }
    await Promise.allSettled(jobs);
    if (!stopped) timer = setTimeout(tick, document.hidden ? POLL_MS * 3 : POLL_MS);
  };
  timer = setTimeout(tick, 1000);
  return {
    on: (e, h) => { (handlers[e] ||= new Set()).add(h); },
    off: (e, h) => { handlers[e] && handlers[e].delete(h); },
    emit: (e, arg) => { if (e === 'join:display') display = true; if (e === 'join:dept') depts.add(arg); },
    disconnect: () => { stopped = true; clearTimeout(timer); },
  };
}

// One socket for the whole app. It reconnects with the user's JWT whenever login state changes.
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    const s = USE_SOCKET ? io(SOCKET_URL, { auth: { token: getToken() } }) : createPollingSocket(user);
    setSocket(s);
    return () => s.disconnect();
  }, [user && user.id]);
  return <Ctx.Provider value={socket}>{children}</Ctx.Provider>;
}

// Subscribe to a socket event for the lifetime of a component.
export function useEvent(event, handler) {
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
}
