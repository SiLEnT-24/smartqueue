import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ThemeToast';
import { Card, PageTitle, Spinner, ErrorNote, Empty, useLoad, Field } from '../components/ui';

export default function CounterManagement() {
  const toast = useToast();
  const { data: counters, error, loading, reload } = useLoad(() => api.get('/admin/counters'));
  const { data: depts } = useLoad(() => api.get('/admin/departments'));
  const [name, setName] = useState(''); const [err, setErr] = useState('');

  const save = async (id, patch) => { setErr(''); try { await api.patch(`/admin/counters/${id}`, patch); toast('Counter updated', 'success'); reload(); } catch (e) { setErr(e.message); } };
  const add = async (e) => { e.preventDefault(); setErr(''); try { await api.post('/admin/counters', { name, departments: [] }); setName(''); toast('Counter created. Now choose its departments.', 'success'); reload(); } catch (e2) { setErr(e2.message); } };
  const toggleDept = (c, id) => { const ids = c.departments.map((d) => d._id); save(c._id, { departments: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] }); };

  return (
    <>
      <PageTitle title="Counters" sub="Configure active counters and the departments they serve." />
      <ErrorNote message={error || err} />
      <Card className="mb-6"><form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1"><Field label="New counter name" id="cn"><input id="cn" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Counter 4" /></Field></div>
        <button className="btn btn-primary"><Plus size={16} />Add counter</button></form></Card>
      {loading ? <Spinner /> : !counters?.length ? <Card><Empty title="No counters yet" hint="Add a counter above." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {counters.map((c) => (
            <Card key={c._id}>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">{c.name}</h2>
                <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={c.active} onChange={(e) => save(c._id, { active: e.target.checked })} />{c.active ? 'Active' : 'Inactive'}</label></div>
              <fieldset className="mb-4"><legend className="label">Departments served</legend>
                <div className="flex flex-wrap gap-2">{(depts || []).filter((d) => d.active).map((d) => { const on = c.departments.some((x) => x._id === d._id); return (
                  <button key={d._id} type="button" aria-pressed={on} onClick={() => toggleDept(c, d._id)} className={`badge !px-3 !py-1.5 text-sm ${on ? 'border-cyan bg-cyan/15 text-cyan' : 'text-mute'}`} style={on ? {} : { borderColor: 'var(--line)' }}>{d.code}: {d.name}</button>); })}</div></fieldset>
            </Card>))}
        </div>)}
    </>);
}
