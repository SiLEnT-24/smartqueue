// Small fetch wrapper: adds the JWT, parses JSON, throws friendly errors.
const BASE = import.meta.env.VITE_API_URL || '/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined; // undefined => same origin (Vite proxy)

export const getToken = () => localStorage.getItem('sq_token');
export const setToken = (t) => (t ? localStorage.setItem('sq_token', t) : localStorage.removeItem('sq_token'));

async function request(path, { method = 'GET', body, blob } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() && { Authorization: `Bearer ${getToken()}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }
  if (blob && res.ok) return res.blob();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || 'Something went wrong'); e.status = res.status; throw e; }
  return data;
}
export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b || {} }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
  blob: (p) => request(p, { blob: true }),
};
