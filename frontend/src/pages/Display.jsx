import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, VolumeX, Activity } from 'lucide-react';
import { api } from '../api';
import { useSocket, useEvent } from '../context/SocketContext';

// Public reception screen. No login required. Large text, high contrast.
export default function Display() {
  const socket = useSocket();
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  const [audio, setAudio] = useState(false); const [notes, setNotes] = useState([{ id: 0, text: 'Welcome. Please watch this screen for your token number.' }]);
  const [clock, setClock] = useState(new Date());
  const seen = useRef(null);
  const speechOk = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const apply = useCallback((d) => {
    setData(d); setErr('');
    // Announce newly CALLED tokens (text always; voice only if the viewer turned audio on)
    const calls = d.queues.flatMap((q) => q.nowServing.filter((n) => n.status === 'CALLED').map((n) => `${n.tokenNumber}|${n.counter}`));
    if (seen.current) {
      calls.filter((c) => !seen.current.has(c)).forEach((c) => {
        const [tok, counter] = c.split('|');
        const text = `Token ${tok.replace('-', ' ')}, please go to ${counter}.`;
        setNotes((n) => [{ id: Date.now() + Math.random(), text }, ...n].slice(0, 4));
        if (audio && speechOk) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }
      });
    }
    seen.current = new Set(calls);
  }, [audio, speechOk]);

  useEffect(() => { api.get('/queue/display').then(apply).catch((e) => setErr(e.message)); }, []); // first load
  useEffect(() => { socket && socket.emit('join:display'); }, [socket]);
  useEvent('display:update', apply);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  const serving = data ? data.queues.flatMap((q) => q.nowServing.map((n) => ({ ...n, dept: q.department.name }))) : [];
  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-semibold"><Activity className="text-cyan" />SmartQueue</Link>
        <div className="flex items-center gap-4">
          {speechOk ? <button className="btn btn-ghost" onClick={() => setAudio(!audio)} aria-pressed={audio}>{audio ? <Volume2 size={18} /> : <VolumeX size={18} />}Audio {audio ? 'on' : 'off'}</button>
            : <span className="text-sm text-mute">Audio not supported here. Announcements appear as text.</span>}
          <span className="font-display text-3xl tabular-nums">{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </header>
      {err && <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400" role="alert">{err}</p>}

      <section aria-label="Now serving" className="mb-6">
        <h2 className="mb-3 text-xl font-semibold text-mute">Now serving</h2>
        {serving.length === 0 ? <div className="glass p-10 text-center text-2xl text-mute">No token is being served right now.</div> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {serving.map((s) => (
              <div key={s.tokenNumber} className={`glass p-6 ${s.status === 'CALLED' ? 'ring-2 ring-cyan' : 'ring-2 ring-violet/60'}`}>
                <div className="text-lg text-mute">{s.dept}</div>
                <div className="font-display text-7xl font-bold text-cyan sm:text-8xl">{s.tokenNumber}</div>
                <div className="mt-2 flex items-center justify-between text-2xl"><span className="font-semibold">{s.counter}</span>
                  <span className={`badge !text-base ${s.status === 'CALLED' ? 'border-cyan text-cyan' : 'border-violet text-violet'}`}>{s.status === 'CALLED' ? 'Please proceed' : 'In service'}</span></div>
              </div>))}
          </div>)}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass p-5 lg:col-span-2" aria-label="Next tokens">
          <h2 className="mb-3 text-xl font-semibold text-mute">Next in line</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data?.queues.map((q) => (
              <div key={q.department.id} className="rounded-xl p-3" style={{ background: 'var(--glass)' }}>
                <div className="flex justify-between text-sm text-mute"><span>{q.department.name}</span><span>{q.waitingCount} waiting, ~{q.queueWaitMin} min</span></div>
                <div className="mt-2 flex min-h-[2.5rem] flex-wrap gap-2">{q.next.length ? q.next.slice(0, 4).map((n) => <span key={n.tokenNumber} className="rounded-lg border px-3 py-1 font-display text-2xl" style={{ borderColor: 'var(--line)' }}>{n.tokenNumber}</span>) : <span className="text-mute">Queue is empty</span>}</div>
              </div>))}
          </div>
        </section>
        <div className="space-y-4">
          <section className="glass p-5" aria-label="Announcements" aria-live="polite">
            <h2 className="mb-3 text-xl font-semibold text-mute">Announcements</h2>
            <ul className="space-y-2">{notes.map((n) => <li key={n.id} className="rounded-lg p-2.5 text-lg" style={{ background: 'var(--glass)' }}>{n.text}</li>)}</ul>
          </section>
          <section className="glass p-5" aria-label="Recently completed">
            <h2 className="mb-3 text-xl font-semibold text-mute">Recently completed</h2>
            <div className="flex flex-wrap gap-2">{data?.recentlyCompleted.length ? data.recentlyCompleted.map((r) => <span key={r.tokenNumber} className="badge !text-base border-emerald-400/30 text-emerald-400">{r.tokenNumber}</span>) : <span className="text-mute">None yet today</span>}</div>
          </section>
        </div>
      </div>
    </div>);
}
