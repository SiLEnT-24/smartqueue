import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

// ---- theme ----
const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('sq_theme') || 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sq_theme', theme);
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }}>{children}</ThemeCtx.Provider>;
}

// ---- toasts (in-app alerts) ----
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), 6000);
  }, []);
  const icon = { info: Info, success: CheckCircle2, error: XCircle };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => { const I = icon[t.type] || Info; return (
          <div key={t.id} className="glass page-in flex items-start gap-3 p-3.5 text-sm">
            <I size={18} className={t.type === 'error' ? 'text-red-400' : t.type === 'success' ? 'text-emerald-400' : 'text-cyan'} />
            <span>{t.message}</span>
          </div>); })}
      </div>
    </ToastCtx.Provider>
  );
}
