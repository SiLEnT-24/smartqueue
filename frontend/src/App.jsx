import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth, homeFor } from './context/AuthContext';
import Landing from './pages/Landing';
import { Login, Register } from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import GenerateToken from './pages/GenerateToken';
import TokenDetails from './pages/TokenDetails';
import Display from './pages/Display';
import StaffDashboard from './pages/StaffDashboard';
import CounterManagement from './pages/CounterManagement';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import Feedback from './pages/Feedback';
import Profile from './pages/Profile';
import Assistant from './pages/Assistant';
import NotFound from './pages/NotFound';

const Guard = ({ roles, children }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
function Home() { const { user } = useAuth(); return <Navigate to={homeFor(user.role)} replace />; }

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin-login" element={<Login adminOnly />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin-register" element={<Register adminOnly />} />
      <Route path="/display" element={<Display />} />
      <Route path="/app" element={<Guard><Layout /></Guard>}>
        <Route index element={<Guard roles={['student']}><StudentDashboard /></Guard>} />
        <Route path="new" element={<Guard roles={['student']}><GenerateToken /></Guard>} />
        <Route path="token/:id" element={<Guard roles={['student']}><TokenDetails /></Guard>} />
        <Route path="staff" element={<Guard roles={['staff', 'admin']}><StaffDashboard /></Guard>} />
        <Route path="admin" element={<Guard roles={['admin']}><AdminDashboard /></Guard>} />
        <Route path="counters" element={<Guard roles={['admin']}><CounterManagement /></Guard>} />
        <Route path="analytics" element={<Guard roles={['admin']}><Analytics /></Guard>} />
        <Route path="feedback" element={<Guard roles={['student', 'admin']}><Feedback /></Guard>} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="profile" element={<Profile />} />
        <Route path="home" element={<Home />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
