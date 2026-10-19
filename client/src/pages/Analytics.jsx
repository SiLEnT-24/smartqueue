import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { api } from '../api';
import { useToast } from '../context/ThemeToast';
import { Card, PageTitle, Spinner, ErrorNote, Stat, Empty, useLoad } from '../components/ui';
import { Ticket, Users, Loader, CheckCircle2, UserX, Clock } from 'lucide-react';

const today = () => new Date().toLocaleDateString('en-CA');
const AX = { fill: '#94a3b8', fontSize: 12 };
const TIP = { background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0' };

const ChartCard = ({ title, children, empty }) => (
  <Card><h2 className="mb-3 font-semibold">{title}</h2>{empty ? <Empty title="No data for this filter" /> : <div className="h-64" role="img" aria-label={title}>{children}</div>}</Card>);

export default function Analytics() {
  const toast = useToast();
  const [f, setF] = useState({ from: today(), to: today(), department: '' });
  const { data: depts } = useLoad(() => api.get('/admin/departments'));
  const [a, setA] = useState(null); const [err, setErr] = useState('');
  const { data: fb } = useLoad(() => api.get('/feedback'));
  const qs = new URLSearchParams({ from: f.from, to: f.to, ...(f.department && { department: f.department }) }).toString();

  useEffect(() => { setA(null); api.get(`/analytics?${qs}`).then((x) => { setA(x); setErr(''); }).catch((e) => setErr(e.message)); }, [qs]);

  const exportCsv = async () => {
    try { const b = await api.blob(`/analytics/export?${qs}`); const u = URL.createObjectURL(b); const el = document.createElement('a'); el.href = u; el.download = `smartqueue-report-${f.from}_to_${f.to}.csv`; el.click(); URL.revokeObjectURL(u); }
    catch (e) { toast('Could not export the report', 'error'); }
  };
  const t = a?.totals;
  const statusData = t ? [['Waiting', t.waiting], ['Serving', t.serving], ['Completed', t.completed], ['No-show', t.noShow], ['Cancelled', t.cancelled]].map(([name, count]) => ({ name, count })) : [];

  return (
    <>
      <PageTitle title="Analytics and reports" sub="Every figure is calculated from stored token records.">
        <button className="btn btn-primary" onClick={exportCsv}><Download size={16} />Export CSV</button></PageTitle>
      <Card className="mb-5"><div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="from">From</label><input id="from" type="date" className="input" value={f.from} max={f.to} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" type="date" className="input" value={f.to} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
        <div><label className="label" htmlFor="dp">Department</label><select id="dp" className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}><option value="">All departments</option>{(depts || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
      </div></Card>
      <ErrorNote message={err} />
      {!a ? (!err && <Spinner />) : (<>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Tokens generated" value={t.total} icon={Ticket} /><Stat label="Waiting" value={t.waiting} icon={Users} /><Stat label="Serving" value={t.serving} icon={Loader} />
          <Stat label="Completed" value={t.completed} icon={CheckCircle2} /><Stat label="No-shows" value={t.noShow} icon={UserX} />
          <Stat label="Avg. wait / service (min)" value={a.avgWaitMin} decimals={1} icon={Clock} suffix={a.avgServiceMin != null ? ` / ${a.avgServiceMin}` : ''} />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Tokens by status" empty={!t.total}><ResponsiveContainer><BarChart data={statusData}><CartesianGrid stroke="#94a3b822" /><XAxis dataKey="name" tick={AX} /><YAxis allowDecimals={false} tick={AX} /><Tooltip contentStyle={TIP} /><Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Hourly token demand" empty={!t.total}><ResponsiveContainer><LineChart data={a.hourly}><CartesianGrid stroke="#94a3b822" /><XAxis dataKey="hour" tick={AX} /><YAxis allowDecimals={false} tick={AX} /><Tooltip contentStyle={TIP} /><Line type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Current queue length by department" empty={!a.departmentQueues.length}><ResponsiveContainer><BarChart data={a.departmentQueues}><CartesianGrid stroke="#94a3b822" /><XAxis dataKey="code" tick={AX} /><YAxis allowDecimals={false} tick={AX} /><Tooltip contentStyle={TIP} /><Bar dataKey="waiting" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Counter utilisation (minutes in service)" empty={!a.counterUtilization.length}><ResponsiveContainer><BarChart data={a.counterUtilization}><CartesianGrid stroke="#94a3b822" /><XAxis dataKey="counter" tick={AX} /><YAxis tick={AX} /><Tooltip contentStyle={TIP} formatter={(v, n) => [v, n === 'busyMinutes' ? 'Busy minutes' : 'Tokens served']} /><Bar dataKey="busyMinutes" fill="#22d3ee" radius={[6, 6, 0, 0]} /><Bar dataKey="served" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        </div>
        <Card className="mt-6"><h2 className="mb-3 font-semibold">Customer satisfaction</h2>
          {!fb || !fb.count ? <Empty title="No feedback yet" hint="Ratings appear after visitors complete service." /> : (
            <div><p className="mb-3 text-sm">Average <b>{fb.average}</b> / 5 from {fb.count} response{fb.count > 1 ? 's' : ''}</p>
              <div className="grid gap-2 sm:grid-cols-2">{fb.byDepartment.map((d) => <div key={d._id} className="flex justify-between rounded-xl p-3 text-sm" style={{ background: 'var(--glass)' }}><span>{d.name}</span><span><b>{d.avg}</b> ({d.count})</span></div>)}</div></div>)}
        </Card>
      </>)}
    </>);
}
