import { useEffect, useRef, useState } from 'react';
import { Loader2, Inbox, AlertTriangle } from 'lucide-react';

export const Card = ({ className = '', children, ...p }) => <div className={`glass p-5 ${className}`} {...p}>{children}</div>;

const COLORS = {
  WAITING: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  CALLED: 'bg-cyan/15 text-cyan border-cyan/40',
  SERVING: 'bg-violet/20 text-violet border-violet/40',
  COMPLETED: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30',
  SKIPPED: 'bg-orange-400/15 text-orange-400 border-orange-400/30',
  NO_SHOW: 'bg-red-400/15 text-red-400 border-red-400/30',
  CANCELLED: 'bg-slate-400/15 text-mute border-slate-400/30',
  ON_HOLD: 'bg-yellow-300/15 text-yellow-400 border-yellow-300/30',
};
export const StatusBadge = ({ status }) => (
  <span className={`badge ${COLORS[status] || ''}`}>{status.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}</span>
);

export const Spinner = ({ label = 'Loading' }) => (
  <div className="flex items-center justify-center gap-2 py-12 text-mute" role="status"><Loader2 className="animate-spin" size={18} />{label}…</div>
);
export const Empty = ({ title, hint, children }) => (
  <div className="flex flex-col items-center gap-2 py-10 text-center">
    <Inbox className="text-mute" size={28} /><p className="font-medium">{title}</p>
    {hint && <p className="max-w-xs text-sm text-mute">{hint}</p>}{children}
  </div>
);
export const ErrorNote = ({ message }) => message ? (
  <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400" role="alert">
    <AlertTriangle size={16} className="mt-0.5 shrink-0" />{message}
  </div>) : null;

export const Field = ({ label, id, children }) => (<div><label htmlFor={id} className="label">{label}</label>{children}</div>);

export const PageTitle = ({ title, sub, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-mute">{sub}</p>}</div>{children}
  </div>
);

export const LiveDot = () => <span className="inline-flex items-center gap-2 text-xs text-mute"><span className="live-dot" />Live</span>;

// Counts smoothly from the previous value to the new one (instant when reduced motion is on)
export function AnimatedNumber({ value, decimals = 0 }) {
  const [shown, setShown] = useState(value ?? 0);
  const prev = useRef(value ?? 0);
  useEffect(() => {
    const to = value ?? 0, from = prev.current;
    if (from === to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(to); prev.current = to; return; }
    const start = performance.now(); let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 500);
      setShown(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{Number(shown).toFixed(decimals)}</>;
}

export const Stat = ({ label, value, decimals = 0, suffix = '', icon: Icon }) => (
  <Card className="flex items-center gap-4">
    {Icon && <div className="rounded-xl bg-cyan/10 p-2.5 text-cyan"><Icon size={20} /></div>}
    <div><div className="font-display text-2xl font-semibold">{value == null ? '—' : <><AnimatedNumber value={value} decimals={decimals} />{suffix}</>}</div>
      <div className="text-sm text-mute">{label}</div></div>
  </Card>
);

// simple async-load hook with error + reload
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const run = () => fn().then((data) => setState({ data, error: '', loading: false }))
    .catch((e) => setState((s) => ({ data: s.data, error: e.message, loading: false })));
  useEffect(() => { run(); /* eslint-disable-next-line */ }, deps);
  return { ...state, reload: run };
}
