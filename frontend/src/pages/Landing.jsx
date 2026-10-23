import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Bell, BarChart3, Tv, Gauge, ShieldCheck, Users, Sun, Moon, Ticket, Radio, CheckCircle2, Bot } from 'lucide-react';
import { useTheme } from '../context/ThemeToast';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui';

// DEMO DATA ONLY: shown so visitors can see what a live queue looks like.
const DEMO = [
  { dept: 'Examination Cell', now: ['EX-014', 'EX-015', 'EX-016'], counter: 'Counter 1', ahead: 6, wait: 10 },
  { dept: 'Accounts Office', now: ['AC-031', 'AC-032', 'AC-033'], counter: 'Counter 2', ahead: 3, wait: 9 },
  { dept: 'Library', now: ['LB-007', 'LB-008', 'LB-009'], counter: 'Counter 3', ahead: 1, wait: 2 },
];
const FEATURES = [
  [Ticket, 'Digital tokens', 'Pick a service and get a numbered token like EX-014 in one tap.'],
  [Radio, 'Live tracking', 'See who is being served and how many people are ahead, updated instantly.'],
  [Gauge, 'Honest wait times', 'Wait = people ahead × average service time ÷ open counters, and always labelled approximate.'],
  [Users, 'Fair counter allocation', 'Only open counters that serve the department get tokens, and first come, first served stays intact.'],
  [Bell, 'Alerts', 'In-app alerts, plus browser notifications once you allow them.'],
  [Tv, 'Reception display', 'A big-screen view for the waiting area with optional spoken announcements.'],
  [BarChart3, 'Analytics', 'Charts and CSV reports built from real token records.'],
  [ShieldCheck, 'Role-based access', 'Users manage their own tokens while administrators control queues and settings.'],
];

export default function Landing() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => x + 1), 3500); return () => clearInterval(t); }, []);

  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 font-display text-lg font-semibold"><Activity className="text-cyan" />SmartQueue</span>
        <nav className="flex items-center gap-2" aria-label="Account">
          <button className="btn btn-ghost !p-2" onClick={toggle} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <Link to="/register" className="btn btn-primary hidden sm:inline-flex">Register</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Stop standing in line.<br />Track it from your phone.</h1>
          <p className="mt-5 max-w-lg text-lg text-mute">SmartQueue replaces paper tokens and crowded corridors with digital tokens, live queue tracking and clear waiting-time estimates for every college office.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn btn-primary !px-6 !py-3 text-base">Get started</Link>
            <Link to="/login" className="btn btn-ghost !px-6 !py-3 text-base">Log in</Link>
            <a href="/display" className="btn btn-ghost !px-6 !py-3 text-base"><Tv size={18} />Open public display</a>
          </div>
        </div>

        <Card aria-label="Live queue preview with demo data">
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium"><span className="live-dot" />Queue preview</span>
            <span className="badge border-amber-400/40 bg-amber-400/10 text-amber-400">Demo data</span>
          </div>
          <div className="space-y-3">
            {DEMO.map((d, k) => (
              <div key={d.dept} className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--glass)' }}>
                <div className="flex items-center justify-between text-sm text-mute"><span>{d.dept}</span><span>{d.counter}</span></div>
                <div className="mt-1 flex items-end justify-between">
                  <div><div className="text-xs text-mute">Now serving</div><div key={i} className="page-in font-display text-3xl font-bold text-cyan">{d.now[(i + k) % 3]}</div></div>
                  <div className="text-right text-sm"><div>{d.ahead} ahead</div><div className="text-mute">~{d.wait} min</div></div>
                </div>
              </div>))}
          </div>
          <p className="mt-3 text-xs text-mute">Sample numbers for illustration, not real performance.</p>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="how">
        <h2 id="how" className="mb-8 text-2xl font-semibold">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {[['Choose a service', 'Log in and pick the office you need, such as Accounts or the Library.'],
            ['Get your token', 'You receive a token number, your place in line and an estimated wait.'],
            ['Arrive when called', 'Watch your phone or the display screen. You are alerted as your turn nears.']].map(([t, d], n) => (
            <li key={t}><Card className="h-full"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-cyan/15 font-display font-semibold text-cyan">{n + 1}</div>
              <h3 className="text-lg font-semibold">{t}</h3><p className="mt-1 text-sm text-mute">{d}</p></Card></li>))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="feat">
        <h2 id="feat" className="mb-8 text-2xl font-semibold">What you get</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([Icon, t, d]) => (<Card key={t}><Icon className="mb-3 text-violet" size={22} /><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-mute">{d}</p></Card>))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-2">
        {[['For users and visitors', ['No more guessing how long the line is', 'Wait anywhere and come back when your turn is near', 'Rate the service afterwards']],
          ['For administrators', ['One-click call, start, complete and skip', 'Fewer crowded corridors and disputes about who is next', 'Reports and feedback from real data']]].map(([t, items]) => (
          <Card key={t}><h3 className="mb-3 text-lg font-semibold">{t}</h3>
            <ul className="space-y-2 text-sm">{items.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />{x}</li>)}</ul></Card>))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <h2 className="text-2xl font-semibold">Ready to skip the crowd?</h2>
          <Link to="/register" className="btn btn-primary !px-8 !py-3 text-base">Get started</Link>
        </Card>
      </section>
      <footer className="pb-8 text-center text-sm text-mute">SmartQueue, a B.Tech CSE project. Waiting times are estimates.</footer>
      <Link
        to={user ? '/app/assistant' : '/login'}
        state={user ? undefined : { from: '/app/assistant' }}
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-cyan text-slate-950 shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
        aria-label="Chat with the AI assistant"
        title="Chat with the AI assistant"
      >
        <Bot size={24} />
      </Link>
    </div>
  );
}
