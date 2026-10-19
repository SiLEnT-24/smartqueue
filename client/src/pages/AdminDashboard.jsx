import { useState } from 'react';
import { Ticket, Users, CheckCircle2, Clock, PhoneCall, Star } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ThemeToast';
import { useEvent } from '../context/SocketContext';
import { Card, PageTitle, Spinner, ErrorNote, Empty, useLoad, Stat, StatusBadge, Field } from '../components/ui';
import { useCallback } from 'react';

const TABS = ['Overview', 'Departments', 'Users', 'Tokens', 'Audit log'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');
  return (
    <>
      <PageTitle title="Administration" sub="System-wide queue control." />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>{t}</button>)}</div>
      {tab === 'Overview' && <Overview />}{tab === 'Departments' && <Departments />}{tab === 'Users' && <Users_ />}{tab === 'Tokens' && <Tokens />}{tab === 'Audit log' && <Audit />}
    </>);
}

function Overview() {
  const toast = useToast();
  const { data: a, error, reload } = useLoad(() => api.get('/analytics'));
  const { data: depts } = useLoad(() => api.get('/admin/departments'));
  const { data: fb } = useLoad(() => api.get('/feedback'));
  useEvent('queue:update', useCallback(() => reload(), []));
  const autoCall = async (d) => { try { const r = await api.post('/staff/auto-call', { departmentId: d._id }); toast(r.token ? `${r.token.tokenNumber} called. ${r.message}` : 'Queue is empty', r.token ? 'success' : 'info'); reload(); } catch (e) { toast(e.message, 'error'); } };
  if (!a) return error ? <ErrorNote message={error} /> : <Spinner />;
  const t = a.totals;
  return (<>
    <p className="mb-3 text-sm text-mute">Today ({a.range.from}), calculated from stored tokens.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Stat label="Tokens generated" value={t.total} icon={Ticket} /><Stat label="Waiting now" value={t.waiting} icon={Users} /><Stat label="Completed" value={t.completed} icon={CheckCircle2} />
      <Stat label="Avg. wait (min)" value={a.avgWaitMin} decimals={1} icon={Clock} /><Stat label="Avg. service (min)" value={a.avgServiceMin} decimals={1} icon={Clock} /><Stat label="Average rating" value={fb?.average} decimals={1} icon={Star} />
    </div>
    <h2 className="mb-3 mt-8 text-lg font-semibold">Auto-assign the best free counter</h2>
    <p className="mb-3 text-sm text-mute">Picks an active, free counter serving that department with the lowest workload today, then calls the next token.</p>
    <div className="flex flex-wrap gap-2">{(depts || []).filter((d) => d.active).map((d) => <button key={d._id} className="btn btn-ghost" onClick={() => autoCall(d)}><PhoneCall size={16} />{d.name}</button>)}</div>
  </>);
}

function Departments() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get('/admin/departments'));
  const [f, setF] = useState({ name: '', code: '', defaultServiceMinutes: 5, description: '' }); const [err, setErr] = useState('');
  const save = async (id, patch) => { setErr(''); try { await api.patch(`/admin/departments/${id}`, patch); toast('Department saved', 'success'); reload(); } catch (e) { setErr(e.message); } };
  const add = async (e) => { e.preventDefault(); setErr(''); try { await api.post('/admin/departments', { ...f, defaultServiceMinutes: Number(f.defaultServiceMinutes) }); setF({ name: '', code: '', defaultServiceMinutes: 5, description: '' }); toast('Department added', 'success'); reload(); } catch (e2) { setErr(e2.message); } };
  return (<>
    <ErrorNote message={error || err} />
    <Card className="mb-5"><form onSubmit={add} className="grid gap-3 sm:grid-cols-5">
      <div className="sm:col-span-2"><Field label="Name" id="dn"><input id="dn" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
      <Field label="Code (2-4 letters)" id="dc"><input id="dc" className="input" required minLength={2} maxLength={4} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field>
      <Field label="Avg. minutes" id="dm"><input id="dm" type="number" min="1" max="120" className="input" value={f.defaultServiceMinutes} onChange={(e) => setF({ ...f, defaultServiceMinutes: e.target.value })} /></Field>
      <div className="flex items-end"><button className="btn btn-primary w-full">Add department</button></div></form></Card>
    {loading ? <Spinner /> : <div className="grid gap-4 md:grid-cols-2">{data.map((d) => <DeptCard key={d._id} d={d} save={save} />)}</div>}
  </>);
}
function DeptCard({ d, save }) {
  const [mins, setMins] = useState(d.defaultServiceMinutes);
  return (<Card>
    <div className="flex items-center justify-between"><h3 className="font-semibold">{d.name} <span className="badge ml-1 border-cyan/40 text-cyan">{d.code}</span></h3>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.active} onChange={(e) => save(d._id, { active: e.target.checked })} />Active</label></div>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <Field label="Default service time (min)" id={`m${d._id}`}><input id={`m${d._id}`} type="number" min="1" max="120" className="input !w-28" value={mins} onChange={(e) => setMins(e.target.value)} /></Field>
      <button className="btn btn-ghost" onClick={() => save(d._id, { defaultServiceMinutes: Number(mins) })}>Save time</button>
      <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" checked={d.priorityEnabled} onChange={(e) => save(d._id, { priorityEnabled: e.target.checked })} />Allow priority service</label></div>
  </Card>);
}

function Users_() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get('/admin/users'));
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'staff' }); const [err, setErr] = useState('');
  const add = async (e) => { e.preventDefault(); setErr(''); try { await api.post('/admin/users', f); setF({ name: '', email: '', password: '', role: 'staff' }); toast('User created', 'success'); reload(); } catch (e2) { setErr(e2.message); } };
  const toggle = async (u) => { try { await api.patch(`/admin/users/${u._id}`, { active: !u.active }); reload(); } catch (e) { toast(e.message, 'error'); } };
  return (<>
    <ErrorNote message={error || err} />
    <Card className="mb-5"><form onSubmit={add} className="grid gap-3 sm:grid-cols-5">
      <Field label="Name" id="un"><input id="un" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Email" id="ue"><input id="ue" type="email" className="input" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Password" id="up"><input id="up" type="password" minLength={6} className="input" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Field label="Role" id="ur"><select id="ur" className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="staff">Staff</option><option value="admin">Admin</option><option value="student">Student</option></select></Field>
      <div className="flex items-end"><button className="btn btn-primary w-full">Create user</button></div></form></Card>
    {loading ? <Spinner /> : <Card className="overflow-x-auto !p-0"><table className="w-full text-left text-sm"><thead className="text-mute"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
      <tbody>{data.map((u) => <tr key={u._id} className="border-t" style={{ borderColor: 'var(--line)' }}><td className="p-3">{u.name}</td><td className="p-3 text-mute">{u.email}</td><td className="p-3 capitalize">{u.role}</td><td className="p-3">{u.active ? 'Active' : 'Deactivated'}</td>
        <td className="p-3 text-right"><button className="btn btn-ghost !py-1.5" onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></Card>}
  </>);
}

function Tokens() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get('/tokens'));
  useEvent('queue:update', useCallback(() => reload(), []));
  const setPriority = async (t, value) => {
    const reason = window.prompt(value ? 'Reason for granting priority (for example, accessibility need):' : 'Reason for removing priority:');
    if (!reason) return;
    try { await api.patch(`/tokens/${t.id}/priority`, { value, reason }); toast('Priority updated and recorded in the audit log', 'success'); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return (<><ErrorNote message={error} />{loading ? <Spinner /> : !data.length ? <Card><Empty title="No tokens yet" /></Card> : (
    <Card className="overflow-x-auto !p-0"><table className="w-full text-left text-sm"><thead className="text-mute"><tr><th className="p-3">Token</th><th className="p-3">Service</th><th className="p-3">Status</th><th className="p-3">Counter</th><th className="p-3">Created</th><th className="p-3" /></tr></thead>
      <tbody>{data.map((t) => <tr key={t.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
        <td className="p-3 font-semibold">{t.tokenNumber}{t.priority && <span className="badge ml-2 border-violet/40 text-violet">Priority</span>}</td><td className="p-3">{t.department.name}</td><td className="p-3"><StatusBadge status={t.status} /></td><td className="p-3 text-mute">{t.counter || '—'}</td><td className="p-3 text-mute">{new Date(t.createdAt).toLocaleTimeString()}</td>
        <td className="p-3 text-right">{t.status === 'WAITING' && <button className="btn btn-ghost !py-1.5" onClick={() => setPriority(t, !t.priority)}>{t.priority ? 'Remove priority' : 'Grant priority'}</button>}</td></tr>)}</tbody></table></Card>)}</>);
}

function Audit() {
  const { data, error, loading } = useLoad(() => api.get('/admin/audit-logs'));
  return (<><ErrorNote message={error} />{loading ? <Spinner /> : !data.length ? <Card><Empty title="No activity recorded yet" /></Card> : (
    <Card className="overflow-x-auto !p-0"><table className="w-full text-left text-sm"><thead className="text-mute"><tr><th className="p-3">Time</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Token</th><th className="p-3">Details</th></tr></thead>
      <tbody>{data.map((l) => <tr key={l._id} className="border-t" style={{ borderColor: 'var(--line)' }}><td className="p-3 text-mute">{new Date(l.timestamp).toLocaleString()}</td><td className="p-3">{l.user?.name || '—'}</td><td className="p-3 font-medium">{l.action}</td><td className="p-3">{l.token?.tokenNumber || '—'}</td><td className="p-3 text-mute">{l.details}</td></tr>)}</tbody></table></Card>)}</>);
}
