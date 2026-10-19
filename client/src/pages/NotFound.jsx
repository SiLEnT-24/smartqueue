import { Link } from 'react-router-dom';
export default function NotFound() {
  return (<div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
    <div className="font-display text-7xl font-bold text-cyan">404</div>
    <h1 className="text-2xl font-semibold">This page does not exist</h1>
    <p className="text-mute">The link may be wrong, or the page was moved.</p>
    <Link to="/" className="btn btn-primary mt-2">Go to the home page</Link></div>);
}
