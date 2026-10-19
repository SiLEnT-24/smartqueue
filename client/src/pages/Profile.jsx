import { useState } from 'react';
import { Bell, Moon, Sun } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme, useToast } from '../context/ThemeToast';
import { Card, PageTitle, Field, ErrorNote } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth(); const { theme, toggle } = useTheme(); const toast = useToast();
  const [name, setName] = useState(user.name); const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  const [perm, setPerm] = useState('Notification' in window ? Notification.permission : 'unsupported');

  const save = async (e) => { e.preventDefault(); setErr('');
    try { const r = await api.patch('/auth/me', { name, ...(pw && { password: pw }) }); setUser(r.user); setPw(''); toast('Profile saved', 'success'); } catch (e2) { setErr(e2.message); } };
  const ask = async () => { const p = await Notification.requestPermission(); setPerm(p); toast(p === 'granted' ? 'Browser notifications enabled' : 'Browser notifications were not allowed', p === 'granted' ? 'success' : 'info'); };

  return (<><PageTitle title="Profile and settings" />
    <div className="grid gap-4 md:grid-cols-2">
      <Card><form onSubmit={save} className="space-y-4"><ErrorNote message={err} />
        <Field label="Name" id="n"><input id="n" className="input" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email" id="e"><input id="e" className="input opacity-70" value={user.email} disabled /></Field>
        <Field label="New password (leave blank to keep)" id="p"><input id="p" type="password" minLength={6} autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <button className="btn btn-primary">Save changes</button></form></Card>
      <div className="space-y-4">
        <Card><h2 className="mb-1 font-semibold">Browser notifications</h2><p className="mb-3 text-sm text-mute">Get a pop-up when your token is near or called, even if this tab is in the background. In-app alerts always work. SMS and WhatsApp are not part of this version.</p>
          {perm === 'unsupported' ? <p className="text-sm text-mute">This browser does not support notifications.</p> : perm === 'granted' ? <p className="text-sm text-emerald-400">Enabled</p> : perm === 'denied' ? <p className="text-sm text-amber-400">Blocked. Allow notifications for this site in your browser settings.</p> : <button className="btn btn-ghost" onClick={ask}><Bell size={16} />Enable notifications</button>}</Card>
        <Card><h2 className="mb-3 font-semibold">Theme</h2><button className="btn btn-ghost" onClick={toggle}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}Switch to {theme === 'dark' ? 'light' : 'dark'}</button></Card>
      </div></div></>);
}
