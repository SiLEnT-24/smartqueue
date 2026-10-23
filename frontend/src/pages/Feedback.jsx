import { useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ThemeToast';
import { Card, PageTitle, Spinner, Empty, ErrorNote, useLoad } from '../components/ui';

function Stars({ value, onChange }) {
  return (<div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => (
    <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded-lg p-1">
      <Star size={28} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-mute'} /></button>))}</div>);
}

function Pending({ t, done }) {
  const toast = useToast(); const [r, setR] = useState(0); const [c, setC] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const send = async (e) => { e.preventDefault(); if (!r) return setErr('Please choose a rating from 1 to 5.'); setBusy(true); setErr('');
    try { await api.post('/feedback', { tokenId: t.id, rating: r, comment: c }); toast('Thank you for your feedback', 'success'); done(); } catch (e2) { setErr(e2.message); } finally { setBusy(false); } };
  return (<Card><form onSubmit={send} className="space-y-3">
    <div className="flex items-center justify-between"><h2 className="font-semibold">{t.department.name}</h2><span className="font-display text-cyan">{t.tokenNumber}</span></div>
    <Stars value={r} onChange={setR} />
    <label className="label" htmlFor={`c${t.id}`}>Comment (optional)</label>
    <textarea id={`c${t.id}`} className="input" rows={3} maxLength={500} value={c} onChange={(e) => setC(e.target.value)} />
    <ErrorNote message={err} /><button className="btn btn-primary" disabled={busy}>Send feedback</button></form></Card>);
}

export default function Feedback() {
  const { user } = useAuth();
  return user.role === 'admin' ? <AdminView /> : <UserView />;
}

function UserView() {
  const { data, error, loading, reload } = useLoad(() => api.get('/feedback/pending'));
  return (<><PageTitle title="Feedback" sub="Rate the service you received." /><ErrorNote message={error} />
    {loading ? <Spinner /> : !data.length ? <Card><Empty title="Nothing to rate" hint="Completed tokens that need feedback show up here." /></Card>
      : <div className="grid gap-4 md:grid-cols-2">{data.map((t) => <Pending key={t.id} t={t} done={reload} />)}</div>}</>);
}

function AdminView() {
  const { data, error, loading } = useLoad(() => api.get('/feedback'));
  return (<><PageTitle title="Feedback" sub="What visitors say about each service." /><ErrorNote message={error} />
    {loading ? <Spinner /> : !data.count ? <Card><Empty title="No feedback yet" /></Card> : (<>
      <div className="mb-4 grid gap-4 sm:grid-cols-3"><Card><div className="font-display text-3xl font-semibold">{data.average}<span className="text-base text-mute"> / 5</span></div><div className="text-sm text-mute">Average rating</div></Card>
        <Card><div className="font-display text-3xl font-semibold">{data.count}</div><div className="text-sm text-mute">Responses</div></Card></div>
      <Card className="mb-4"><h2 className="mb-3 font-semibold">By department</h2>{data.byDepartment.map((d) => <div key={d._id} className="flex justify-between border-t py-2 text-sm first:border-0" style={{ borderColor: 'var(--line)' }}><span>{d.name}</span><span><b>{d.avg}</b> from {d.count}</span></div>)}</Card>
      <Card><h2 className="mb-3 font-semibold">Latest comments</h2>{data.latest.map((f) => <div key={f._id} className="border-t py-3 text-sm first:border-0" style={{ borderColor: 'var(--line)' }}>
        <div className="flex justify-between"><span className="font-medium">{f.token?.tokenNumber} · {f.department?.name}</span><span className="text-amber-400">{'★'.repeat(f.rating)}<span className="text-mute">{'★'.repeat(5 - f.rating)}</span></span></div>{f.comment && <p className="mt-1 text-mute">{f.comment}</p>}</div>)}</Card></>)}</>);
}
