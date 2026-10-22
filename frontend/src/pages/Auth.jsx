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

export function Login({ adminOnly = false }) {
  const { login, logout } = useAuth(); const nav = useNavigate(); const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const u = await login(f.email, f.password);
      if (adminOnly && u.role !== 'admin') {
        logout();
        setErr('This account does not have administrator access.');
        return;
      }
      nav(adminOnly ? '/app/admin' : loc.state?.from?.startsWith('/app') ? loc.state.from : homeFor(u.role), { replace: true });
    }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <Shell
      title={adminOnly ? 'Administrator login' : 'Welcome back'}
      sub={adminOnly ? 'Sign in with your administrator account.' : 'Log in to see your queue.'}
      foot={adminOnly
        ? <>Need an administrator account? <Link to="/admin-register" className="text-cyan underline">Register with the admin code</Link><br />Not an administrator? <Link to="/login" className="text-cyan underline">Regular login</Link></>
        : <>New here? <Link to="/register" className="text-cyan underline">Create an account</Link><br />Administrator? <Link to="/admin-login" className="text-cyan underline">Admin login</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={err} />
        <Field label="Email" id="email"><input id="email" type="email" required autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" id="pw"><div className="relative"><input id="pw" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" className="input pr-11" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-mute hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </Shell>);
}

export function Register({ adminOnly = false }) {
  const { register, registerAdmin } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', registrationCode: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (adminOnly) await registerAdmin(f.name, f.email, f.password, f.registrationCode);
      else await register(f.name, f.email, f.password);
      nav(adminOnly ? '/app/admin' : '/app', { replace: true });
    }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <Shell
      title={adminOnly ? 'Create administrator account' : 'Create your account'}
      sub={adminOnly ? 'Register one of up to five administrators with the shared registration code.' : 'Create a student account. Staff accounts are managed by an administrator.'}
      foot={adminOnly
        ? <>Already have an administrator account? <Link to="/admin-login" className="text-cyan underline">Admin login</Link></>
        : <>Already registered? <Link to="/login" className="text-cyan underline">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={err} />
        <Field label="Full name" id="name"><input id="name" required minLength={2} autoComplete="name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Email" id="email"><input id="email" type="email" required autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        {adminOnly && <Field label="Administrator registration code" id="registrationCode"><input id="registrationCode" type="password" required autoComplete="off" className="input" value={f.registrationCode} onChange={(e) => setF({ ...f, registrationCode: e.target.value })} /></Field>}
        <Field label="Password (at least 6 characters)" id="pw"><div className="relative"><input id="pw" type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" className="input pr-11" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-mute hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : adminOnly ? 'Create administrator account' : 'Create account'}</button>
      </form>
    </Shell>);
}
