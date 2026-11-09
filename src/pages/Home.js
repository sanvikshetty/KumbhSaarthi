import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const quickLinks = [
    { icon: '📊', label: 'Dashboard',    path: '/dashboard' },
    { icon: '📝', label: 'Registration', path: '/registration' },
    { icon: '👥', label: 'Visitors',     path: '/visitors' },
    { icon: '🚨', label: 'Emergency Center', path: '/notifications' },
    { icon: '👤', label: 'Profile',      path: '/profile' },
    { icon: '⚙️', label: 'Settings',     path: '/settings' },
  ];

  return (
    <div className={`home-root ${mounted ? 'home-mounted' : ''}`}>
      <div className="home-orb home-orb-1" />
      <div className="home-orb home-orb-2" />
      <div className="home-orb home-orb-3" />

      <div className="home-inner">
        {user ? (
          /* ── Logged-in view ── */
          <>
            <div className="home-hero">
              <span className="home-eyebrow">🕉️ Welcome back</span>
              <h1 className="home-title">Hello, {user.name}! <br /><span>Good to see you</span></h1>
              <p className="home-subtitle">You are logged in as <strong style={{color:'#a78bfa'}}>{user.role}</strong>. Use the quick links below to navigate.</p>
            </div>

            <div className="home-quick-grid">
              {quickLinks.filter(l => !(l.path === '/visitors' && user.role === 'visitor') && !(l.path === '/notifications' && user.role === 'visitor')).map((l, i) => (
                <div
                  className="home-quick-card"
                  key={i}
                  style={{ animationDelay: `${0.1 + i * 0.07}s` }}
                  onClick={() => navigate(l.path)}
                >
                  <span className="home-quick-icon">{l.icon}</span>
                  <span className="home-quick-label">{l.label}</span>
                  <div className="home-card-bar" />
                </div>
              ))}
            </div>

            <div className="home-info">
              <h2>KumbhSaarthi</h2>
              <p>Monitor crowd levels, manage visitor registrations, and ensure a safe experience for all pilgrims — all from one place.</p>
            </div>
          </>
        ) : (
          /* ── Guest view ── */
          <>
            <div className="home-hero">
              <span className="home-eyebrow">🕉️ Temple & Pilgrimage Site</span>
              <h1 className="home-title">Crowd Management<br /><span>System</span></h1>
              <p className="home-subtitle">Manage visitor flow and ensure safety with real-time monitoring and analytics</p>
              <div className="home-btns">
                <button className="home-btn home-btn-primary" onClick={() => navigate('/registration')}>Register Visit</button>
                <button className="home-btn home-btn-secondary" onClick={() => navigate('/login')}>Login</button>
              </div>
            </div>

            <div className="home-grid">
              {[
                { icon: '📊', title: 'Real-time Monitoring', desc: 'Track crowd levels in real-time with live updates' },
                { icon: '🎫', title: 'Visitor Registration',  desc: 'Easy online registration for temple visits' },
                { icon: '⚠️', title: 'Alert System',          desc: 'Automatic alerts when capacity limits are reached' },
                { icon: '📈', title: 'Analytics',             desc: 'Detailed reports and visitor analytics' },
              ].map((card, i) => (
                <div className="home-card" key={i} style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                  <div className="home-card-icon">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                  <div className="home-card-bar" />
                </div>
              ))}
            </div>

            <div className="home-info">
              <h2>About the System</h2>
              <p>Our Temple Crowd Management System helps manage visitor flow at temples and pilgrimage sites efficiently. With real-time monitoring, automated alerts, and comprehensive analytics, we ensure a safe and organized experience for all visitors.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
