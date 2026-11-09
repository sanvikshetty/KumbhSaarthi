import React, { useState } from 'react';
import '../styles/Settings.css';

const LANG_CODES = {
  english: 'en',
  hindi:   'hi',
  tamil:   'ta',
  telugu:  'te',
  kannada: 'kn',
  malayalam: 'ml',
};

function triggerTranslate(langCode) {
  if (langCode === 'en') {
    // restore original
    const frame = document.querySelector('.goog-te-menu-frame');
    if (frame) {
      const restore = frame.contentDocument?.querySelector('a.goog-te-menu2-item');
      if (restore) restore.click();
    }
    // fallback: reload with no cookie
    const cookie = document.cookie.match(/googtrans=([^;]+)/);
    if (cookie) {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
      window.location.reload();
    }
    return;
  }
  // Set googtrans cookie and reload
  const val = `/en/${langCode}`;
  document.cookie = `googtrans=${val}; path=/`;
  document.cookie = `googtrans=${val}; path=/; domain=${window.location.hostname}`;
  window.location.reload();
}

function Settings() {
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    smsAlerts: false,
    darkMode: document.body.getAttribute('data-theme') !== 'light',
    language: localStorage.getItem('lang') || 'english',
    autoCheckout: true
  });

  const handleToggle = (key) => {
    const newVal = !settings[key];
    setSettings({ ...settings, [key]: newVal });
    if (key === 'darkMode') {
      document.body.setAttribute('data-theme', newVal ? 'dark' : 'light');
      localStorage.setItem('theme', newVal ? 'dark' : 'light');
    }
  };

  const handleLanguage = (e) => {
    const lang = e.target.value;
    setSettings({ ...settings, language: lang });
    localStorage.setItem('lang', lang);
    triggerTranslate(LANG_CODES[lang]);
  };

  return (
    <div className="settings-page">
      <div className="container">
        <h1 className="page-title">⚙️ Settings</h1>

        <div className="settings-grid">
          <div className="settings-section">
            <h3>🔔 Notifications</h3>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Push Notifications</h4>
                <p>Receive push notifications for updates</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={() => handleToggle('notifications')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Email Alerts</h4>
                <p>Get email notifications for bookings</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={() => handleToggle('emailAlerts')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>SMS Alerts</h4>
                <p>Receive SMS for important updates</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.smsAlerts}
                  onChange={() => handleToggle('smsAlerts')}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>🎨 Appearance</h3>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Dark Mode</h4>
                <p>Switch to dark theme</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={() => handleToggle('darkMode')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Language</h4>
                <p>Choose your preferred language</p>
              </div>
              <select
                value={settings.language}
                onChange={handleLanguage}
                className="setting-select"
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="tamil">Tamil</option>
                <option value="telugu">Telugu</option>
                <option value="kannada">Kannada</option>
                <option value="malayalam">Malayalam</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>🔐 Privacy & Security</h3>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Auto Checkout</h4>
                <p>Automatically checkout after visit</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.autoCheckout}
                  onChange={() => handleToggle('autoCheckout')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Change Password</h4>
                <p>Update your account password</p>
              </div>
              <button className="btn-action">Change</button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Delete Account</h4>
                <p>Permanently delete your account</p>
              </div>
              <button className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
