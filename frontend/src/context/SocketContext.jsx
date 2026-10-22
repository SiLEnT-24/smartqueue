import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, getToken } from '../api';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useSocket = () => useContext(Ctx);

// One socket for the whole app. It reconnects with the user's JWT whenever login state changes.
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    const s = io(SOCKET_URL, { auth: { token: getToken() } });
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
