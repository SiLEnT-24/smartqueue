import { useCallback, useEffect, useState } from 'react';
import { PhoneCall, Play, CheckCheck, SkipForward, UserX, Pause, RotateCcw, Info } from 'lucide-react';
import { api } from '../api';
import { useEvent } from '../context/SocketContext';
import { useToast } from '../context/ThemeToast';
import { Card, StatusBadge, Spinner, Empty, ErrorNote, PageTitle, LiveDot, Stat } from '../components/ui';
import { CheckCircle2, Users } from 'lucide-react';

export default function QueueControl() {
  const toast = useToast();
  const [counters, setCounters] = useState([]); const [cid, setCid] = useState('');
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');

  const load = useCallback(() => api.get(`/admin/queue?counterId=${cid}`).then((x) => { setD(x); setErr(''); }).catch((e) => setErr(e.message)), [cid]);
  useEffect(() => { api.get('/admin/counters').then((c) => {
    setCounters(c);
    if (c[0]) setCid(c[0]._id);
    else setD({ counter: null, waiting: [], current: null, completedToday: 0 });
  }).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { if (cid) load(); }, [load, cid]);
  useEvent('queue:update', useCallback(() => { if (cid) load(); }, [load, cid]));

  const run = async (fn) => { setBusy(true); setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); toast(e.message, 'error'); } finally { setBusy(false); } };
  const body = { counterId: cid };
  const callNext = () => run(async () => { const r = await api.post('/admin/queue/call-next', body); setNote(r.message); if (!r.token) toast('The queue is empty', 'info'); });
  const act = (id, action) => run(() => api.post(`/admin/queue/tokens/${id}/${action}`, body));

  if (!d && !err) return <Spinner />;
  const cur = d?.current;
  const Btn = ({ id, action, icon: I, label, kind = 'btn-ghost' }) => <button className={`btn ${kind}`} disabled={busy} onClick={() => act(id, action)}><I size={16} />{label}</button>;

  return (
    <>
      <PageTitle title={d?.counter ? d.counter.name : 'Queue control'} sub="Manage tokens across counters and departments.">
        <LiveDot />
      </PageTitle>
      {counters.length > 0 && <div className="mb-4 max-w-xs"><label className="label" htmlFor="ctr">Counter</label>
        <select id="ctr" className="input" value={cid} onChange={(e) => setCid(e.target.value)}>{counters.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>}
      <ErrorNote message={err} />
      {d && !d.counter ? <Card><Empty title="No counters available" hint="Create and activate a counter, then assign it to a department." /></Card> : d && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <Stat label="Completed by this counter today" value={d.completedToday} icon={CheckCircle2} />
            <Stat label="Waiting for this counter" value={d.waiting.filter((t) => t.status === 'WAITING').length} icon={Users} />
          </div>

          <Card className="mb-6">
            {cur ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><div className="text-sm text-mute">{cur.status === 'CALLED' ? 'Called, waiting for the visitor' : 'Now serving'}</div>
                  <div className="font-display text-5xl font-bold text-cyan">{cur.tokenNumber}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-mute">{cur.department.name} <StatusBadge status={cur.status} /></div></div>
                <div className="flex flex-wrap gap-2">
                  {cur.status === 'CALLED' && <><Btn id={cur.id} action="start" icon={Play} label="Start service" kind="btn-primary" /><Btn id={cur.id} action="skip" icon={SkipForward} label="Skip" /><Btn id={cur.id} action="no-show" icon={UserX} label="No-show" /><Btn id={cur.id} action="hold" icon={Pause} label="Hold" /></>}
                  {cur.status === 'SERVING' && <Btn id={cur.id} action="complete" icon={CheckCheck} label="Complete" kind="btn-primary" />}
                </div>
              </div>) : (
              <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-lg font-semibold">Counter is free</div><div className="text-sm text-mute">Call the next token when you are ready.</div></div>
                <button className="btn btn-primary !px-6 !py-3" disabled={busy || !d.counter.active} onClick={callNext}><PhoneCall size={18} />Call next</button></div>)}
            {note && <p className="mt-4 flex gap-2 rounded-xl p-3 text-sm text-mute" style={{ background: 'var(--glass)' }}><Info size={16} className="mt-0.5 shrink-0" />{note}</p>}
            {!d.counter.active && <p className="mt-3 text-sm text-amber-400">This counter is inactive. Activate it on the Counters page.</p>}
          </Card>

          <h2 className="mb-3 text-lg font-semibold">Queue for this counter's departments</h2>
          {d.waiting.length === 0 ? <Card><Empty title="No one is waiting" hint="New tokens will appear here instantly." /></Card> : (
            <Card className="overflow-x-auto !p-0"><table className="w-full text-left text-sm">
              <thead className="text-mute"><tr><th className="p-3">Token</th><th className="p-3">Service</th><th className="p-3">Status</th><th className="p-3">Est. wait</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody>{d.waiting.map((t) => (<tr key={t.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
                <td className="p-3 font-semibold">{t.tokenNumber}{t.priority && <span className="badge ml-2 border-violet/40 text-violet">Priority</span>}</td>
                <td className="p-3">{t.department.name}</td><td className="p-3"><StatusBadge status={t.status} /></td><td className="p-3 text-mute">{t.status === 'WAITING' ? `~${t.estimatedWaitMin} min` : '—'}</td>
                <td className="p-3"><div className="flex justify-end gap-2">
                  {t.status === 'WAITING' && <Btn id={t.id} action="hold" icon={Pause} label="Hold" />}
                  {t.status === 'ON_HOLD' && <Btn id={t.id} action="resume" icon={Play} label="Resume" />}
                  {t.status === 'SKIPPED' && <><Btn id={t.id} action="recall" icon={RotateCcw} label="Recall" /><Btn id={t.id} action="no-show" icon={UserX} label="No-show" /></>}
                </div></td></tr>))}</tbody></table></Card>)}
        </>)}
    </>);
}
