import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/SocketContext';
import { Card, StatusBadge, Spinner, Empty, ErrorNote, PageTitle, LiveDot, AnimatedNumber } from '../components/ui';
import { useLoad } from '../components/ui';

const ACTIVE = ['WAITING', 'CALLED', 'SERVING', 'ON_HOLD', 'SKIPPED'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad(() => api.get('/tokens/mine'));
  useEvent('token:update', useCallback(() => reload(), []));   // refresh whenever the server pushes a change
  const active = (data || []).filter((t) => ACTIVE.includes(t.status));
  const past = (data || []).filter((t) => !ACTIVE.includes(t.status));

  return (
    <>
      <PageTitle title={`Hello, ${user.name.split(' ')[0]}`} sub="Your tokens update on their own. No refreshing needed.">
        <Link to="/app/new" className="btn btn-primary"><Plus size={16} />Get a token</Link>
      </PageTitle>
      <ErrorNote message={error} />
      {loading ? <Spinner /> : (
        <>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Active tokens</h2><LiveDot /></div>
          {active.length === 0 ? <Card><Empty title="No active token" hint="Choose a service to join its queue."><Link to="/app/new" className="btn btn-primary mt-2">Get a token</Link></Empty></Card> : (
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((t) => (
                <Link key={t.id} to={`/app/token/${t.id}`} className="glass block p-5 transition hover:-translate-y-0.5">
                  <div className="flex items-start justify-between"><div><div className="text-sm text-mute">{t.department.name}</div>
                    <div className="font-display text-4xl font-bold text-cyan">{t.tokenNumber}</div></div><StatusBadge status={t.status} /></div>
                  <div className="mt-4 flex items-end justify-between text-sm">
                    {t.status === 'WAITING' ? <><div><span className="font-display text-2xl font-semibold"><AnimatedNumber value={t.peopleAhead} /></span> <span className="text-mute">ahead</span></div><div className="text-mute">{t.estimatedWaitLabel}</div></>
                      : <div>{t.status === 'CALLED' ? `Go to ${t.counter || 'the counter'} now` : t.status === 'SERVING' ? `Being served at ${t.counter}` : 'See details'}</div>}
                    <ChevronRight size={18} className="text-mute" />
                  </div>
                </Link>))}
            </div>)}

          <h2 className="mb-3 mt-10 text-lg font-semibold">History</h2>
          {past.length === 0 ? <Card><Empty title="Nothing here yet" hint="Finished and cancelled tokens will appear here." /></Card> : (
            <Card className="overflow-x-auto !p-0">
              <table className="w-full text-left text-sm"><thead className="text-mute"><tr><th className="p-3">Token</th><th className="p-3">Service</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
                <tbody>{past.map((t) => (<tr key={t.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
                  <td className="p-3 font-semibold">{t.tokenNumber}</td><td className="p-3">{t.department.name}</td><td className="p-3"><StatusBadge status={t.status} /></td>
                  <td className="p-3 text-mute">{new Date(t.createdAt).toLocaleString()}</td></tr>))}</tbody></table>
            </Card>)}
        </>)}
    </>);
}
