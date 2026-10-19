import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { api } from '../api';
import { useSocket, useEvent } from '../context/SocketContext';
import { useToast } from '../context/ThemeToast';
import { Card, StatusBadge, Spinner, ErrorNote, LiveDot, AnimatedNumber } from '../components/ui';

export default function TokenDetails() {
  const { id } = useParams(); const toast = useToast(); const socket = useSocket();
  const [t, setT] = useState(null); const [q, setQ] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const startAhead = useRef(null);

  const loadQueue = (depId) => api.get(`/queue/status/${depId}`).then(setQ).catch(() => {});
  useEffect(() => {
    api.get(`/tokens/${id}`).then((x) => { setT(x); startAhead.current = x.peopleAhead; loadQueue(x.department.id); socket && socket.emit('join:dept', x.department.id); }).catch((e) => setErr(e.message));
  }, [id, socket]);
  useEvent('token:update', useCallback((x) => { if (x.id === id) setT(x); }, [id]));
  useEvent('queue:update', useCallback((s) => { if (t && s.department.id === t.department.id) setQ(s); }, [t]));

  const cancel = async () => {
    if (!window.confirm('Cancel this token? You will lose your place in line.')) return;
    setBusy(true);
    try { setT(await api.post(`/tokens/${id}/cancel`)); toast('Token cancelled', 'success'); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (err && !t) return <ErrorNote message={err} />;
  if (!t) return <Spinner />;
  const waiting = t.status === 'WAITING';
  if (startAhead.current == null || t.peopleAhead > startAhead.current) startAhead.current = t.peopleAhead;
  const progress = waiting ? (startAhead.current ? Math.round(((startAhead.current - t.peopleAhead) / startAhead.current) * 100) : 0)
    : ['CALLED', 'SERVING', 'COMPLETED'].includes(t.status) ? 100 : 0;
  const canCancel = ['WAITING', 'CALLED', 'ON_HOLD'].includes(t.status);
  const now = q && q.nowServing.find((n) => n.status) ;

  return (
    <>
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-mute hover:text-ink"><ArrowLeft size={16} />Back</Link>
      <ErrorNote message={err} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between"><div><div className="text-sm text-mute">{t.department.name}</div>
            <div className="font-display text-6xl font-bold text-cyan sm:text-7xl">{t.tokenNumber}</div></div>
            <div className="flex flex-col items-end gap-2"><StatusBadge status={t.status} />{t.priority && <span className="badge border-violet/40 text-violet">Priority</span>}<LiveDot /></div></div>

          {t.status === 'CALLED' && <div className="mt-5 rounded-xl border border-cyan/40 bg-cyan/10 p-4 font-semibold" role="alert">Your token is called. Please go to {t.counter || 'the counter'}.</div>}
          {t.status === 'SERVING' && <div className="mt-5 rounded-xl border border-violet/40 bg-violet/10 p-4 font-semibold">You are being served at {t.counter}.</div>}
          {t.status === 'ON_HOLD' && <div className="mt-5 rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-4">Staff placed your token on hold. They will resume it shortly.</div>}
          {t.status === 'SKIPPED' && <div className="mt-5 rounded-xl border border-orange-400/40 bg-orange-400/10 p-4">You were not at the counter when called. Please contact the help desk.</div>}

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div><div className="text-sm text-mute">People ahead</div><div className="font-display text-3xl font-semibold">{waiting ? <AnimatedNumber value={t.peopleAhead} /> : '—'}</div></div>
            <div><div className="text-sm text-mute">Your position</div><div className="font-display text-3xl font-semibold">{t.position ?? '—'}</div></div>
            <div className="col-span-2 sm:col-span-1"><div className="text-sm text-mute">Estimated wait</div><div className="font-display text-xl font-semibold">{waiting ? t.estimatedWaitLabel : '—'}</div></div>
          </div>

          <div className="mt-6" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Queue progress">
            <div className="h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--glass-strong)' }}>
              <div className="bar h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, rgb(var(--cyan)), rgb(var(--violet)))' }} /></div>
            <div className="mt-1 text-xs text-mute">{progress}% of the way to your turn</div>
          </div>

          {t.allocationNote && <p className="mt-5 flex gap-2 rounded-xl p-3 text-sm text-mute" style={{ background: 'var(--glass)' }}><Info size={16} className="mt-0.5 shrink-0" />{t.allocationNote}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            {canCancel && <button className="btn btn-danger" onClick={cancel} disabled={busy}>Cancel token</button>}
            {t.status === 'COMPLETED' && <Link to="/app/feedback" className="btn btn-primary">Rate this service</Link>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Queue right now</h2>
          {!q ? <Spinner /> : <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Now serving</dt><dd className="font-semibold">{q.nowServing.length ? q.nowServing.map((n) => n.tokenNumber).join(', ') : 'None yet'}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Waiting in total</dt><dd className="font-semibold">{q.waitingCount}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Open counters</dt><dd className="font-semibold">{q.activeCounters}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Avg. service time</dt><dd className="font-semibold">{q.avgServiceMinutes} min <span className="text-xs text-mute">({q.avgSource === 'live' ? 'from recent tokens' : 'default'})</span></dd></div>
            <div><dt className="mb-1 text-mute">Next in line</dt><dd className="flex flex-wrap gap-1.5">{q.next.length ? q.next.map((n) => <span key={n.tokenNumber} className={`badge ${n.tokenNumber === t.tokenNumber ? 'border-cyan text-cyan' : ''}`} style={{ borderColor: 'var(--line)' }}>{n.tokenNumber}</span>) : <span className="text-mute">No one waiting</span>}</dd></div>
          </dl>}
        </Card>
      </div>
    </>);
}
