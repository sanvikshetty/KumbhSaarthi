import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import '../styles/VisitorLogin.css';

function VisitorLogin({ onLogin }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', phone: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (isLogin) {
        const result  = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const phone   = userDoc.exists() ? userDoc.data().phone : '';
        onLogin({ name: result.user.displayName || 'Visitor', email: result.user.email, role: 'visitor', phone });
      } else {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(result.user, { displayName: formData.name });
        await setDoc(doc(db, 'users', result.user.uid), {
          name: formData.name, email: formData.email, phone: formData.phone, role: 'visitor', createdAt: new Date()
        });
        onLogin({ name: formData.name, email: formData.email, role: 'visitor', phone: formData.phone });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth.*\)/, ''));
    } finally { setLoading(false); }
  };

  return (
    <div className="vl-root">
      <div className="vl-orb vl-orb1" />
      <div className="vl-orb vl-orb2" />

      <div className="vl-container">
        {/* Left Panel */}
        <div className="vl-left">
          <div className="vl-left-content">
            <div className="vl-temple-icon">🕉️</div>
            <h1 className="vl-brand">KumbhSaarthi</h1>
            <p className="vl-tagline">Your divine journey begins here</p>
            <div className="vl-divider" />
            <div className="vl-features">
              {[
                { icon: '📅', text: 'Book your visit in seconds' },
                { icon: '🎫', text: 'Digital QR code entry' },
                { icon: '🪔', text: 'Pre-book Puja & Prasad' },
                { icon: '👑', text: 'VIP Pass for priority darshan' },
                { icon: '🅿️', text: 'Reserve parking in advance' },
              ].map((f, i) => (
                <div key={i} className="vl-feature">
                  <span>{f.icon}</span>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="vl-right">
          <div className="vl-form-card">
            <div className="vl-tabs">
              <button className={`vl-tab ${isLogin ? 'vl-tab-active' : ''}`} onClick={() => { setIsLogin(true); setError(''); }}>Sign In</button>
              <button className={`vl-tab ${!isLogin ? 'vl-tab-active' : ''}`} onClick={() => { setIsLogin(false); setError(''); }}>Sign Up</button>
            </div>

            <h2 className="vl-form-title">{isLogin ? 'Welcome Back 🙏' : 'Create Account 🌸'}</h2>
            <p className="vl-form-sub">{isLogin ? 'Sign in to manage your temple visits' : 'Join KumbhSaarthi for a seamless experience'}</p>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="vl-field">
                  <label>Full Name</label>
                  <div className="vl-input-wrap">
                    <span>👤</span>
                    <input name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Enter your full name" required={!isLogin} />
                  </div>
                </div>
              )}
              <div className="vl-field">
                <label>Email Address</label>
                <div className="vl-input-wrap">
                  <span>📧</span>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required />
                </div>
              </div>
              {!isLogin && (
                <div className="vl-field">
                  <label>Phone Number</label>
                  <div className="vl-input-wrap">
                    <span>📱</span>
                    <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="10-digit mobile number" required={!isLogin} />
                  </div>
                </div>
              )}
              <div className="vl-field">
                <label>Password</label>
                <div className="vl-input-wrap">
                  <span>🔒</span>
                  <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" required />
                </div>
              </div>

              {error && <div className="vl-error">⚠️ {error}</div>}

              <button type="submit" className="vl-submit" disabled={loading}>
                {loading ? <span className="vl-spinner" /> : isLogin ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>

            <p className="vl-switch">
              {isLogin ? "Don't have an account? " : 'Already registered? '}
              <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </span>
            </p>
            <p className="vl-admin-link"><a href="/admin/login">Admin / Staff Login →</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VisitorLogin;
