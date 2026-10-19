import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Monitor } from 'lucide-react';
import { api } from '../api';
import { useSocket, useEvent } from '../context/SocketContext';
import { Card, ErrorNote, PageTitle, Spinner, Empty, useLoad } from '../components/ui';
import { useToast } from '../context/ThemeToast';

export default function GenerateToken() {
  const nav = useNavigate(); const toast = useToast(); const socket = useSocket();
  const { data: depts, error, loading } = useLoad(() => api.get('/departments'));
  const [status, setStatus] = useState({});   // departmentId -> live queue status
  const [busy, setBusy] = useState(''); const [err, setErr] = useState('');

  useEffect(() => {
    if (!depts) return;
    depts.forEach((d) => {
      api.get(`/queue/status/${d._id}`).then((s) => setStatus((m) => ({ ...m, [d._id]: s }))).catch(() => {});
      socket && socket.emit('join:dept', d._id);
    });
  }, [depts, socket]);
  useEvent('queue:update', useCallback((s) => setStatus((m) => ({ ...m, [s.department.id]: s })), []));

  const take = async (d) => {
    setErr(''); setBusy(d._id);
    try { const t = await api.post('/tokens', { departmentId: d._id }); toast(`Token ${t.tokenNumber} generated`, 'success'); nav(`/app/token/${t.id}`); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  return (
    <>
      <PageTitle title="Get a token" sub="Pick the service you need. Numbers shown are live." />
      <ErrorNote message={error || err} />
      {loading ? <Spinner /> : !depts?.length ? <Card><Empty title="No services available" hint="Ask the administrator to activate a department." /></Card> : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {depts.map((d) => { const s = status[d._id]; const closed = s && s.activeCounters === 0; return (
            <Card key={d._id} className="flex flex-col">
              <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{d.name}</h2><span className="badge border-cyan/40 text-cyan">{d.code}</span></div>
              <p className="mt-1 min-h-[2.5rem] text-sm text-mute">{d.description || 'Visit this counter for service.'}</p>
              <div className="my-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div><Users size={16} className="mx-auto mb-1 text-mute" /><b>{s ? s.waitingCount : '–'}</b><div className="text-xs text-mute">waiting</div></div>
                <div><Clock size={16} className="mx-auto mb-1 text-mute" /><b>{s ? `~${s.queueWaitMin}m` : '–'}</b><div className="text-xs text-mute">approx. wait</div></div>
                <div><Monitor size={16} className="mx-auto mb-1 text-mute" /><b>{s ? s.activeCounters : '–'}</b><div className="text-xs text-mute">counters</div></div>
              </div>
              <button className="btn btn-primary mt-auto" disabled={busy === d._id || closed} onClick={() => take(d)}>
                {closed ? 'No counter open' : busy === d._id ? 'Generating…' : 'Generate token'}</button>
            </Card>); })}
        </div>)}
    </>);
}
