import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

function AdminSetup() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('staff');
  const [status, setStatus]     = useState('');

  const createAdmin = async () => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        name: email.split('@')[0], email, role, createdAt: new Date()
      });
      setStatus(`✅ ${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setStatus('⚠️ This email is already registered. Use a different email or login directly.');
      } else {
        setStatus('❌ ' + err.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (err) { console.log(err); }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#e2e2f0' }}>
      <h2>One-Time Admin Setup</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '20px auto' }}>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#1e1e3a', color: '#fff' }}
        />
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password (min 6 chars)"
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#1e1e3a', color: '#fff' }}
        />
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#1e1e3a', color: '#fff' }}>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
        <button onClick={createAdmin}
          style={{ padding: '12px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', background: 'linear-gradient(135deg,#f4a261,#7c3aed)', border: 'none', color: '#fff', fontWeight: '700' }}>
          Create {role.charAt(0).toUpperCase() + role.slice(1)} Account
        </button>
        <button onClick={handleLogout}
          style={{ padding: '12px', fontSize: '14px', cursor: 'pointer', borderRadius: '8px', background: 'rgba(255,77,109,.15)', border: '1px solid rgba(255,77,109,.3)', color: '#ff4d6d', fontWeight: '700' }}>
          🚪 Logout
        </button>
      </div>
      {status && <p style={{ marginTop: '20px', fontWeight: 'bold' }}>{status}</p>}
    </div>
  );
}

export default AdminSetup;
