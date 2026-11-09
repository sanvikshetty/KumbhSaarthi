import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/Profile.css';

function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: '' });
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setFormData({
      name: userData.name || '', email: userData.email || '',
      phone: userData.phone || '', role: userData.role || 'visitor'
    });
    const unsub = onSnapshot(collection(db, 'bookings'), snap => {
      const mine = snap.docs.map(d => d.data()).filter(b =>
        (userData.phone && b.phone === userData.phone) ||
        (userData.name && b.name?.toLowerCase() === userData.name.toLowerCase())
      );
      setStats({
        total:     mine.length,
        completed: mine.filter(b => b.status === 'CHECKED_OUT').length,
        pending:   mine.filter(b => b.status === 'REGISTERED').length,
      });
    });
    return () => unsub();
  }, []);

  const handleSave = () => {
    localStorage.setItem('user', JSON.stringify(formData));
    setIsEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="container">
        <h1 className="page-title">👤 My Profile</h1>

        <div className="profile-grid">
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {formData.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <h2>{formData.name || 'User'}</h2>
              <span className="profile-role">{formData.role}</span>
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Bookings</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.completed}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
          </div>

          <div className="profile-details">
            <div className="details-header">
              <h3>Personal Information</h3>
              <button 
                className="btn-edit"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              >
                {isEditing ? '💾 Save' : '✏️ Edit'}
              </button>
            </div>

            <div className="details-form">
              <div className="form-row">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-row">
                <label>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-row">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!isEditing}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-row">
                <label>Role</label>
                <input
                  type="text"
                  value={formData.role}
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

        <div className="activity-section">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">✅</div>
              <div className="activity-content">
                <h4>Checked In</h4>
                <p>Main Temple - Today at 10:30 AM</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">📝</div>
              <div className="activity-content">
                <h4>Registration Completed</h4>
                <p>Evening Darshan - Yesterday</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">🎫</div>
              <div className="activity-content">
                <h4>Booking Confirmed</h4>
                <p>Special Pooja - 2 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
