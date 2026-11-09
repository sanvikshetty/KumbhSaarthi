import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginChoice.css';

function LoginChoice() {
  const navigate = useNavigate();
  return (
    <div className="lc-root">
      {/* Animated background orbs */}
      <div className="lc-orb lc-orb1" />
      <div className="lc-orb lc-orb2" />
      <div className="lc-orb lc-orb3" />

      <div className="lc-inner">
        <div className="lc-header">
          <div className="lc-logo">🕉️</div>
          <h1 className="lc-title">KumbhSaarthi</h1>
          <p className="lc-subtitle">Sacred KumbhSaarthi</p>
        </div>

        <div className="lc-cards">
          {/* Visitor Card */}
          <div className="lc-card lc-visitor" onClick={() => navigate('/visitor/login')}>
            <div className="lc-card-glow lc-glow-visitor" />
            <div className="lc-card-icon">🙏</div>
            <h2>Visitor</h2>
            <p>Book your darshan, manage visits & receive divine blessings</p>
            <ul className="lc-features">
              <li><span>✦</span> Online Visit Booking</li>
              <li><span>✦</span> Puja & Prasad Orders</li>
              <li><span>✦</span> VIP Pass Access</li>
              <li><span>✦</span> Digital QR Entry</li>
            </ul>
            <button className="lc-btn lc-btn-visitor">Enter as Visitor →</button>
          </div>

          {/* Admin Card */}
          <div className="lc-card lc-admin" onClick={() => navigate('/admin/login')}>
            <div className="lc-card-glow lc-glow-admin" />
            <div className="lc-card-icon">🛡️</div>
            <h2>Admin / Staff</h2>
            <p>Manage temple operations, visitors & emergency response</p>
            <ul className="lc-features">
              <li><span>✦</span> Live Dashboard</li>
              <li><span>✦</span> Visitor Management</li>
              <li><span>✦</span> Emergency Center</li>
              <li><span>✦</span> QR Scanner</li>
            </ul>
            <button className="lc-btn lc-btn-admin">Enter as Admin →</button>
          </div>
        </div>

        <p className="lc-footer">© {new Date().getFullYear()} KumbhSaarthi Private Limited</p>
      </div>
    </div>
  );
}

export default LoginChoice;
