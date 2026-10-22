import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const finish = (r) => { setToken(r.token); setUser(r.user); return r.user; };
  const login = useCallback(async (email, password) => finish(await api.post('/auth/login', { email, password })), []);
  const register = useCallback(async (name, email, password) => finish(await api.post('/auth/register', { name, email, password })), []);
  const registerAdmin = useCallback(async (name, email, password, registrationCode) => finish(await api.post('/auth/register-admin', { name, email, password, registrationCode })), []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return <Ctx.Provider value={{ user, setUser, loading, login, register, registerAdmin, logout }}>{children}</Ctx.Provider>;
}

export const homeFor = (role) => ({ admin: '/app/admin', staff: '/app/staff' }[role] || '/app');
