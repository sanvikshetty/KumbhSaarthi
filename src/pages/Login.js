import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'visitor'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock authentication - store user data
    localStorage.setItem('user', JSON.stringify({
      name: formData.name || 'User',
      email: formData.email,
      role: formData.role
    }));
    navigate('/dashboard');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <h1>🕉️ Temple Management</h1>
          <p>Manage crowds efficiently with real-time monitoring and analytics</p>
          <div className="login-features">
            <div className="login-feature">✓ Real-time Crowd Monitoring</div>
            <div className="login-feature">✓ Visitor Registration System</div>
            <div className="login-feature">✓ Advanced Analytics Dashboard</div>
            <div className="login-feature">✓ Automated Notifications</div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-card">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="login-subtitle">
              {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
            </p>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" value={formData.role} onChange={handleChange}>
                    <option value="visitor">Visitor</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              )}

              <button type="submit" className="btn-login">
                {isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="login-toggle">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
