import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';
import { Card, ErrorNote, Field } from '../components/ui';

function Shell({ title, sub, children, foot }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-semibold"><Activity className="text-cyan" />SmartQueue</Link>
        <Card className="page-in !p-7"><h1 className="text-2xl font-semibold">{title}</h1><p className="mb-5 mt-1 text-sm text-mute">{sub}</p>{children}</Card>
        <p className="mt-4 text-center text-sm text-mute">{foot}</p>
      </div>
    </div>);
}

const DEMOS = [['Student', 'student@smartqueue.test', 'Student@123'], ['Staff', 'staff1@smartqueue.test', 'Staff@123'], ['Admin', 'admin@smartqueue.test', 'Admin@123']];

export function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const u = await login(f.email, f.password); nav(loc.state?.from?.startsWith('/app') ? loc.state.from : homeFor(u.role), { replace: true }); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <Shell title="Welcome back" sub="Log in to see your queue." foot={<>New here? <Link to="/register" className="text-cyan underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={err} />
        <Field label="Email" id="email"><input id="email" type="email" required autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" id="pw"><div className="relative"><input id="pw" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" className="input pr-11" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-mute hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
        <p className="mb-2 text-xs text-mute">Local demo accounts (after running the seed script):</p>
        <div className="flex gap-2">{DEMOS.map(([n, email, password]) => <button key={n} type="button" className="btn btn-ghost flex-1 !py-1.5 text-xs" onClick={() => setF({ email, password })}>{n}</button>)}</div>
      </div>
    </Shell>);
}

export function Register() {
  const { register } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await register(f.name, f.email, f.password); nav('/app', { replace: true }); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <Shell title="Create your account" sub="Students and visitors can register here." foot={<>Already registered? <Link to="/login" className="text-cyan underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={err} />
        <Field label="Full name" id="name"><input id="name" required minLength={2} autoComplete="name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Email" id="email"><input id="email" type="email" required autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password (at least 6 characters)" id="pw"><div className="relative"><input id="pw" type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" className="input pr-11" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-mute hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
    </Shell>);
}
