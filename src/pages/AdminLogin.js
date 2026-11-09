import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import '../styles/AdminLogin.css';

function AdminLogin({ onLogin }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'staff' });
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
        const role         = userDoc.exists() ? userDoc.data().role : formData.role;
        onLogin({ name: result.user.displayName || 'Admin', email: result.user.email, role });
        navigate(role === 'staff' ? '/visitors' : '/dashboard');
      } else {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(result.user, { displayName: formData.name });
        await setDoc(doc(db, 'users', result.user.uid), {
          name: formData.name, email: formData.email, role: formData.role, createdAt: new Date()
        });
        onLogin({ name: formData.name, email: formData.email, role: formData.role });
        navigate(formData.role === 'staff' ? '/visitors' : '/dashboard');
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth.*\)/, ''));
    } finally { setLoading(false); }
  };

  const ROLES = [
    { value: 'admin',   label: 'Administrator', icon: '👑', desc: 'Full system access' },
    { value: 'manager', label: 'Manager',        icon: '📊', desc: 'Operations & reports' },
    { value: 'staff',   label: 'Staff',          icon: '🧑‍💼', desc: 'Ground level access' },
  ];

  return (
    <div className="al-root">
      <div className="al-orb al-orb1" />
      <div className="al-orb al-orb2" />

      <div className="al-container">
        {/* Left */}
        <div className="al-left">
          <div className="al-left-content">
            <div className="al-shield">🛡️</div>
            <h1 className="al-brand">KumbhSaarthi</h1>
            <p className="al-tagline">Staff & Admin Portal</p>
            <div className="al-divider" />
            <div className="al-role-info">
              {ROLES.map(r => (
                <div key={r.value} className={`al-role-card ${formData.role === r.value ? 'al-role-active' : ''}`}>
                  <span>{r.icon}</span>
                  <div>
                    <strong>{r.label}</strong>
                    <p>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="al-right">
          <div className="al-form-card">
            <div className="al-tabs">
              <button className={`al-tab ${isLogin ? 'al-tab-active' : ''}`} onClick={() => { setIsLogin(true); setError(''); }}>Sign In</button>
              <button className={`al-tab ${!isLogin ? 'al-tab-active' : ''}`} onClick={() => { setIsLogin(false); setError(''); }}>Create Account</button>
            </div>

            <h2 className="al-form-title">{isLogin ? 'Welcome Back 🛡️' : 'New Account ✨'}</h2>
            <p className="al-form-sub">{isLogin ? 'Sign in to access the management portal' : 'Create a new staff or admin account'}</p>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="al-field">
                  <label>Full Name</label>
                  <div className="al-input-wrap">
                    <span>👤</span>
                    <input name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Enter full name" required={!isLogin} />
                  </div>
                </div>
              )}

              <div className="al-field">
                <label>Email Address</label>
                <div className="al-input-wrap">
                  <span>📧</span>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="admin@temple.com" required />
                </div>
              </div>

              <div className="al-field">
                <label>Password</label>
                <div className="al-input-wrap">
                  <span>🔒</span>
                  <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" required />
                </div>
              </div>

              <div className="al-field">
                <label>Role</label>
                <div className="al-role-select">
                  {ROLES.map(r => (
                    <label key={r.value} className={`al-role-opt ${formData.role === r.value ? 'al-role-opt-active' : ''}`}>
                      <input type="radio" name="role" value={r.value} checked={formData.role === r.value} onChange={handleChange} />
                      <span>{r.icon}</span>
                      <strong>{r.label}</strong>
                    </label>
                  ))}
                </div>
              </div>

              {error && <div className="al-error">⚠️ {error}</div>}

              <button type="submit" className="al-submit" disabled={loading}>
                {loading ? <span className="al-spinner" /> : isLogin ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>

            <p className="al-switch">
              {isLogin ? "Need a new account? " : 'Already have an account? '}
              <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                {isLogin ? 'Create Account' : 'Sign In'}
              </span>
            </p>
            <p className="al-visitor-link"><a href="/visitor/login">← Visitor Login</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
