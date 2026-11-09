import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Visitors from './pages/Visitors';
import Registration from './pages/Registration';
import LoginChoice from './pages/LoginChoice';
import VisitorLogin from './pages/VisitorLogin';
import AdminLogin from './pages/AdminLogin';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import AdminSetup from './pages/AdminSetup';
import PanicButton from './components/PanicButton';
import ConciergeChat from './components/ConciergeChat';
import QRScanner from './pages/QRScanner';
import MyBookings from './pages/MyBookings';
import ParkingBooking from './pages/ParkingBooking';
import ParkingAdmin from './pages/ParkingAdmin';
import DailyLimits from './pages/DailyLimits';
import VIPPass from './pages/VIPPass';
import PujaBooking from './pages/PujaBooking';
import PujaAdmin from './pages/PujaAdmin';
import VIPAdmin from './pages/VIPAdmin';
import PrasadOrder from './pages/PrasadOrder';
import PrasadAdmin from './pages/PrasadAdmin';
import TokenCounter from './pages/TokenCounter';
import TokenDisplay from './pages/TokenDisplay';
import WristbandScanner from './pages/WristbandScanner';
import './styles/App.css';

function PrivateRoute({ user, adminOnly, visitorOnly, managerUp, children }) {
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role === 'visitor') return <Navigate to="/" />;
  if (visitorOnly && user.role !== 'visitor') return <Navigate to="/visitors" />;
  if (managerUp && !['admin','manager'].includes(user.role)) return <Navigate to="/visitors" />;
  return children;
}

function Navigation({ user, setUser }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const hideNavPaths = ['/login', '/visitor/login', '/admin/login'];
  if (hideNavPaths.includes(location.pathname)) return null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="logo">KumbhSaarthi</h1>

        {/* Hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? '✕' : '☰'}
        </button>

        <ul className={`nav-menu ${menuOpen ? 'nav-menu-open' : ''}`}>
          <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
          {user && <li><Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>}
          {user && user.role === 'visitor' && <li><Link to="/registration" onClick={() => setMenuOpen(false)}>Registration</Link></li>}
          {user && user.role === 'visitor' && <li><Link to="/my-bookings" onClick={() => setMenuOpen(false)}>My Bookings</Link></li>}
          {user && user.role === 'visitor' && <li><Link to="/parking" onClick={() => setMenuOpen(false)}>Book Parking</Link></li>}
          {user && user.role === 'visitor' && <li><Link to="/vip-pass" onClick={() => setMenuOpen(false)}>VIP Pass</Link></li>}
          {user && user.role === 'visitor' && <li><Link to="/puja-booking" onClick={() => setMenuOpen(false)}>Book Puja</Link></li>}
          {user && user.role === 'visitor' && <li><Link to="/prasad" onClick={() => setMenuOpen(false)}>Order Prasad</Link></li>}
          {user && ['admin','manager','staff'].includes(user.role) && <li><Link to="/visitors" onClick={() => setMenuOpen(false)}>Visitors</Link></li>}
          {user && ['admin','manager','staff'].includes(user.role) && <li><Link to="/qrscanner" onClick={() => setMenuOpen(false)}>QR Scanner</Link></li>}
          {user && ['admin','manager','staff'].includes(user.role) && <li><Link to="/notifications" onClick={() => setMenuOpen(false)}>Emergency Center</Link></li>}
          {user && ['admin','manager','staff'].includes(user.role) && <li><Link to="/puja-admin" onClick={() => setMenuOpen(false)}>Puja Bookings</Link></li>}
          {user && ['admin','manager','staff'].includes(user.role) && <li><Link to="/token-counter" onClick={() => setMenuOpen(false)}>Token Counter</Link></li>}
          {user && ['admin','manager','staff'].includes(user.role) && <li><Link to="/wristband" onClick={() => setMenuOpen(false)}>Wristband</Link></li>}
          {user && ['admin','manager'].includes(user.role) && <li><Link to="/parking-admin" onClick={() => setMenuOpen(false)}>Parking</Link></li>}
          {user && ['admin','manager'].includes(user.role) && <li><Link to="/daily-limits" onClick={() => setMenuOpen(false)}>Pass Limits</Link></li>}
          {user && ['admin','manager'].includes(user.role) && <li><Link to="/vip-admin" onClick={() => setMenuOpen(false)}>VIP Bookings</Link></li>}
          {user && ['admin','manager'].includes(user.role) && <li><Link to="/prasad-admin" onClick={() => setMenuOpen(false)}>Prasad Orders</Link></li>}
          {user && user.role === 'admin' && <li><Link to="/setup" onClick={() => setMenuOpen(false)}>Admin Setup</Link></li>}
          {user && <li><Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link></li>}
          {user && <li><Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link></li>}
          {user ? (
            <li>
              <button className="nav-logout-btn" onClick={handleLogout}>
                🚪 Logout
              </button>
            </li>
          ) : (
            <li><Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link></li>
          )}
        </ul>
      </div>
    </nav>
  );
}

function AppContent() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', saved);
    // apply saved language via googtrans cookie
    const langMap = { hindi:'hi', tamil:'ta', telugu:'te', kannada:'kn', malayalam:'ml' };
    const savedLang = localStorage.getItem('lang') || 'english';
    if (savedLang !== 'english' && langMap[savedLang]) {
      const val = `/en/${langMap[savedLang]}`;
      document.cookie = `googtrans=${val}; path=/`;
    }
  }, []);

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <>
      <Navigation user={user} setUser={setUser} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={['admin','manager'].includes(user.role) ? '/dashboard' : '/dashboard'} /> : <LoginChoice />} />
        <Route path="/visitor/login" element={user ? <Navigate to="/dashboard" /> : <VisitorLogin onLogin={login} />} />
        <Route path="/admin/login" element={user ? <Navigate to={['admin','manager'].includes(user.role) ? '/dashboard' : '/visitors'} /> : <AdminLogin onLogin={login} />} />
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<PrivateRoute user={user}><Dashboard /></PrivateRoute>} />
        <Route path="/registration" element={<PrivateRoute user={user} visitorOnly><Registration /></PrivateRoute>} />
        <Route path="/visitors" element={<PrivateRoute user={user} adminOnly><Visitors /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute user={user} adminOnly><Notifications /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute user={user}><Profile /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute user={user}><Settings /></PrivateRoute>} />
        <Route path="/setup" element={<PrivateRoute user={user}><AdminSetup /></PrivateRoute>} />
        <Route path="/qrscanner" element={<PrivateRoute user={user} adminOnly><QRScanner /></PrivateRoute>} />
        <Route path="/my-bookings" element={<PrivateRoute user={user} visitorOnly><MyBookings /></PrivateRoute>} />
        <Route path="/parking" element={<PrivateRoute user={user} visitorOnly><ParkingBooking /></PrivateRoute>} />
        <Route path="/parking-admin" element={<PrivateRoute user={user} managerUp><ParkingAdmin /></PrivateRoute>} />
        <Route path="/daily-limits" element={<PrivateRoute user={user} managerUp><DailyLimits /></PrivateRoute>} />
        <Route path="/vip-pass" element={<PrivateRoute user={user} visitorOnly><VIPPass /></PrivateRoute>} />
        <Route path="/puja-booking" element={<PrivateRoute user={user} visitorOnly><PujaBooking /></PrivateRoute>} />
        <Route path="/puja-admin" element={<PrivateRoute user={user} adminOnly><PujaAdmin /></PrivateRoute>} />
        <Route path="/vip-admin" element={<PrivateRoute user={user} managerUp><VIPAdmin /></PrivateRoute>} />
        <Route path="/prasad" element={<PrivateRoute user={user} visitorOnly><PrasadOrder /></PrivateRoute>} />
        <Route path="/prasad-admin" element={<PrivateRoute user={user} managerUp><PrasadAdmin /></PrivateRoute>} />
        <Route path="/token-counter" element={<PrivateRoute user={user} adminOnly><TokenCounter /></PrivateRoute>} />
        <Route path="/wristband" element={<PrivateRoute user={user} adminOnly><WristbandScanner /></PrivateRoute>} />
        <Route path="/token-display" element={<TokenDisplay />} />
      </Routes>
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} KumbhSaarthi Private Limited. All rights reserved.</p>
      </footer>
      <PanicButton user={user} />
      {user && user.role === 'visitor' && <ConciergeChat />}
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;
