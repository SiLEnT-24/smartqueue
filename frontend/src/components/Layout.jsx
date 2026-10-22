import { useCallback, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, MessageSquareHeart, UserCog, Tv, LogOut, Menu, X, Sun, Moon, BarChart3, Monitor, Building2, ListOrdered, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, useToast } from '../context/ThemeToast';
import { useEvent } from '../context/SocketContext';

const NAV = {
  student: [['/app', 'My dashboard', LayoutDashboard, true], ['/app/new', 'Get a token', Ticket], ['/app/feedback', 'Feedback', MessageSquareHeart], ['/app/profile', 'Profile', UserCog]],
  staff: [['/app/staff', 'My counter', ListOrdered, true], ['/app/profile', 'Profile', UserCog]],
  admin: [['/app/admin', 'Overview', LayoutDashboard, true], ['/app/counters', 'Counters', Monitor], ['/app/analytics', 'Analytics', BarChart3], ['/app/feedback', 'Feedback', MessageSquareHeart], ['/app/profile', 'Profile', UserCog]],
};

// Turns socket "notify" events into in-app toasts (+ browser notification if the user allowed it)
function useNotifications() {
  const toast = useToast();
  const last = useRef({});
  const estimates = useRef({});
  useEvent('notify', useCallback((n) => {
    const now = Date.now();
    if (last.current[n.message] && now - last.current[n.message] < 30000) return; // avoid repeats
    last.current[n.message] = now;
    toast(n.message, ['CALLED', 'COMPLETED'].includes(n.type) ? 'success' : 'info');
    if ('Notification' in window && Notification.permission === 'granted') new Notification('SmartQueue', { body: n.message });
  }, [toast]));
  useEvent('token:update', useCallback((t) => {
    const prev = estimates.current[t.id];
    estimates.current[t.id] = t.estimatedWaitMin;
    if (t.status === 'WAITING' && prev != null && Math.abs(prev - t.estimatedWaitMin) >= 5)
      toast(`Estimated wait for ${t.tokenNumber} changed: ${t.estimatedWaitLabel}`, 'info');
  }, [toast]));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  useNotifications();

  const links = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV[user.role].map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}>
          <Icon size={18} />{label}
        </NavLink>))}
      <a href="/display" target="_blank" rel="noreferrer" className="navlink"><Tv size={18} />Public display</a>
    </nav>);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col rounded-none border-y-0 border-l-0 p-4 lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2 font-display text-lg font-semibold"><Activity className="text-cyan" />SmartQueue</Link>
        {links}
        <div className="mt-auto px-2 text-xs text-mute"><div className="truncate font-medium text-ink">{user.name}</div><div className="capitalize">{user.role}</div></div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={`glass fixed inset-y-0 left-0 z-50 w-64 rounded-none p-4 transition-transform lg:hidden ${open ? '' : '-translate-x-full'}`} aria-hidden={!open}>
        <button className="btn btn-ghost mb-4 !p-2" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>{links}
      </aside>

      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md" style={{ borderColor: 'var(--line)' }}>
          <button className="btn btn-ghost !p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <span className="font-display font-semibold lg:hidden">SmartQueue</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost !p-2" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="btn btn-ghost" onClick={() => { logout(); nav('/'); }}><LogOut size={16} />Log out</button>
          </div>
        </header>
        <main className="page-in mx-auto max-w-6xl p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
