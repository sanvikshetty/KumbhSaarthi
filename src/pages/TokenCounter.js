import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/TokenCounter.css';

const TODAY = new Date().toISOString().split('T')[0];
const AVG_MINS = 5;

const getWristbandColor = (issuedAt) => {
  const hour = issuedAt ? new Date(issuedAt).getHours() : new Date().getHours();
  if (hour >= 6  && hour < 12) return { color: '#2dc653', label: '🟢 Morning',   bg: 'rgba(45,198,83,.15)'   };
  if (hour >= 12 && hour < 16) return { color: '#4cc9f0', label: '🔵 Afternoon', bg: 'rgba(76,201,240,.15)'  };
  if (hour >= 16 && hour < 20) return { color: '#f4a261', label: '🟡 Evening',   bg: 'rgba(244,162,97,.15)'  };
  return                               { color: '#a78bfa', label: '🟣 Special',   bg: 'rgba(167,139,250,.15)' };
};

export default function TokenCounter() {
  const [tokens,       setTokens]       = useState([]);
  const [onlineInside, setOnlineInside] = useState(0);
  const [settings,     setSettings]     = useState({ currentServing: 0, totalIssued: 0, date: TODAY });
  const [offlineLimit, setOfflineLimit] = useState(100);
  const [form,         setForm]         = useState({ name: '', phone: '', people: '1' });
  const [wristbandEnabled, setWristbandEnabled] = useState(false);
  const [issuing,      setIssuing]      = useState(false);
  const [calling,      setCalling]      = useState(false);
  const [toast,        setToast]        = useState(null);

  // sync wristband mode with Firestore so WristbandScanner reflects same state
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'wristbandMode'), snap => {
      if (snap.exists()) setWristbandEnabled(snap.data().enabled ?? false);
    });
    return () => unsub();
  }, []);

  const toggleWristband = async (val) => {
    setWristbandEnabled(val);
    try { await setDoc(doc(db, 'settings', 'wristbandMode'), { enabled: val }); } catch {}
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // fetch offline limit from dailyLimits settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'dailyLimits'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setOfflineLimit(data[`offline_${TODAY}`] || data.offlineDefault || 100);
      }
    });
    return () => unsub();
  }, []);

  // fetch token settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'tokenCounter'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        // reset if new day
        if (data.date !== TODAY) {
          setDoc(doc(db, 'settings', 'tokenCounter'), { currentServing: 0, totalIssued: 0, date: TODAY });
        } else {
          setSettings(data);
        }
      } else {
        setDoc(doc(db, 'settings', 'tokenCounter'), { currentServing: 0, totalIssued: 0, date: TODAY });
      }
    });
    return () => unsub();
  }, []);

  // fetch today's tokens
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tokens'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const today = all.filter(t => t.date === TODAY);
      today.sort((a, b) => a.tokenNumber - b.tokenNumber);
      setTokens(today);
    });
    return () => unsub();
  }, []);

  // fetch online visitors currently checked in today
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), snap => {
      const inside = snap.docs.map(d => d.data())
        .filter(b => b.status === 'CHECKED_IN' &&
          b.visitDateTime?.startsWith(TODAY));
      setOnlineInside(inside.length);
    });
    return () => unsub();
  }, []);

  const waitingTokens  = tokens.filter(t => t.status === 'WAITING');
  const servingToken   = tokens.find(t => t.status === 'SERVING');
  const completedCount = tokens.filter(t => t.status === 'DONE').length;
  const totalInsideCount = (tokens.filter(t => t.status === 'SERVING').length) + onlineInside;
  const estimatedWait  = (waitingTokens.length + totalInsideCount) * AVG_MINS;

  const issueToken = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      showToast('❌ Name & Phone are required!', 'error'); return;
    }
    if (tokens.filter(t => t.status !== 'DONE').length >= offlineLimit) {
      showToast('❌ Offline slots full for today!', 'error'); return;
    }
    setIssuing(true);
    try {
      const newNumber   = settings.totalIssued + 1;
      const tokenId     = `T${String(newNumber).padStart(3, '0')}`;
      const now         = new Date();
      const wristband   = getWristbandColor(now);
      const wristbandId = wristbandEnabled ? `W${String(newNumber).padStart(3, '0')}` : null;
      await addDoc(collection(db, 'tokens'), {
        tokenNumber: newNumber, tokenId,
        ...(wristbandEnabled && { wristbandId, wristbandColor: wristband.color, wristbandLabel: wristband.label }),
        name: form.name.trim(), phone: form.phone.trim(),
        people: parseInt(form.people) || 1,
        status: 'WAITING', date: TODAY, issuedAt: now,
        estimatedWait: estimatedWait,
      });
      await updateDoc(doc(db, 'settings', 'tokenCounter'), { totalIssued: newNumber, date: TODAY });
      setForm({ name: '', phone: '', people: '1' });
      showToast(wristbandEnabled
        ? `✅ Token ${tokenId} | Wristband W${String(newNumber).padStart(3,'0')} (${wristband.label}) issued!`
        : `✅ Token ${tokenId} issued!`);
    } catch (e) { showToast('❌ Failed to issue token', 'error'); }
    setIssuing(false);
  };

  const callNext = async () => {
    if (waitingTokens.length === 0) { showToast('No tokens in queue!', 'error'); return; }
    setCalling(true);
    const now = new Date();
    try {
      // mark current serving as done with exit timestamp & duration
      if (servingToken) {
        const enteredAt = servingToken.calledAt?.toDate ? servingToken.calledAt.toDate() : servingToken.calledAt ? new Date(servingToken.calledAt) : null;
        const durationMins = enteredAt ? Math.round((now - enteredAt) / 60000) : null;
        await updateDoc(doc(db, 'tokens', servingToken.id), {
          status: 'DONE', exitedAt: now,
          ...(durationMins !== null && { durationMins })
        });
      }
      // call next — record entry timestamp
      const next = waitingTokens[0];
      await updateDoc(doc(db, 'tokens', next.id), { status: 'SERVING', calledAt: now, enteredAt: now });
      await updateDoc(doc(db, 'settings', 'tokenCounter'), { currentServing: next.tokenNumber, date: TODAY });
      showToast(`📢 Calling ${next.tokenId}!`);
    } catch (e) { showToast('❌ Failed', 'error'); }
    setCalling(false);
  };

  const resetDay = async () => {
    if (!window.confirm('Reset all tokens for today?')) return;
    try {
      await Promise.all(tokens.map(t => updateDoc(doc(db, 'tokens', t.id), { status: 'DONE' })));
      await setDoc(doc(db, 'settings', 'tokenCounter'), { currentServing: 0, totalIssued: 0, date: TODAY });
      showToast('✅ Tokens reset!');
    } catch (e) { showToast('❌ Failed to reset', 'error'); }
  };

  return (
    <div className="tc-root">
      {toast && <div className={`tc-toast tc-toast-${toast.type}`}>{toast.msg}</div>}

      <div className="tc-inner">
        <div className="tc-header">
          <div>
            <h1 className="tc-title">🎫 Token Counter</h1>
            <p className="tc-subtitle">Manage walk-in visitor tokens</p>
          </div>
          <button className="tc-reset-btn" onClick={resetDay}>↺ Reset Day</button>
        </div>

        {/* Stats */}
        <div className="tc-stats">
          <div className="tc-stat tc-stat-serving">
            <span className="tc-stat-label">Now Serving</span>
            <span className="tc-stat-value">
              {servingToken ? servingToken.tokenId : '—'}
            </span>
          </div>
          <div className="tc-stat tc-stat-waiting">
            <span className="tc-stat-label">In Queue</span>
            <span className="tc-stat-value">{waitingTokens.length}</span>
          </div>
          <div className="tc-stat tc-stat-issued">
            <span className="tc-stat-label">Issued Today</span>
            <span className="tc-stat-value">{settings.totalIssued}</span>
          </div>
          <div className="tc-stat tc-stat-done">
            <span className="tc-stat-label">Completed</span>
            <span className="tc-stat-value">{completedCount}</span>
          </div>
          <div className="tc-stat tc-stat-limit">
            <span className="tc-stat-label">Offline Limit</span>
            <span className="tc-stat-value">{offlineLimit}</span>
          </div>
          <div className="tc-stat tc-stat-remaining">
            <span className="tc-stat-label">Slots Left</span>
            <span className="tc-stat-value">{Math.max(0, offlineLimit - tokens.filter(t => t.status !== 'DONE').length)}</span>
          </div>
        </div>

        <div className="tc-main">
          {/* Issue Token */}
          <div className="tc-issue-card">
            <div className="tc-issue-header">
              <h2>{wristbandEnabled ? 'Issue Token + Wristband' : 'Issue Token'}</h2>
              <label className="tc-toggle">
                <input type="checkbox" checked={wristbandEnabled} onChange={e => toggleWristband(e.target.checked)} />
                <span className="tc-toggle-slider" />
                <span className="tc-toggle-label">🎗️ Wristband</span>
              </label>
            </div>
            <div className="tc-form">
              <div className="tc-form-group">
                <label>Visitor Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Required" required />
              </div>
              <div className="tc-form-group">
                <label>Phone *</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Required" required />
              </div>
              <div className="tc-form-group">
                <label>No. of People</label>
                <input type="number" min="1" max="20" value={form.people} onChange={e => setForm({...form, people: e.target.value})} />
              </div>
            </div>

            {wristbandEnabled && (
              <div className="tc-wristband-preview" style={{background: getWristbandColor(new Date()).bg, borderColor: getWristbandColor(new Date()).color}}>
                <span>🎗️ Wristband Color:</span>
                <strong style={{color: getWristbandColor(new Date()).color}}>{getWristbandColor(new Date()).label}</strong>
                <span style={{fontSize:'.75rem',color:'#8b8bb5'}}>Based on current time</span>
              </div>
            )}

            <div className="tc-est-wait">
              ⏱️ Estimated wait: <strong>{estimatedWait} mins</strong>
              <span style={{fontSize:'.75rem',color:'#8b8bb5',marginLeft:'.5rem'}}>
                ({waitingTokens.length} walk-in + {onlineInside} online inside)
              </span>
            </div>
            <button className="tc-issue-btn" onClick={issueToken} disabled={issuing}>
              {issuing ? 'Issuing...' : wristbandEnabled ? '🎫 Issue Token + Wristband' : '🎫 Issue Token'}
            </button>
          </div>

          {/* Call Next */}
          <div className="tc-call-card">
            <h2>Queue Control</h2>
            {servingToken && (
              <div className="tc-now-serving">
                <span className="tc-serving-label">NOW SERVING</span>
                <span className="tc-serving-token">{servingToken.tokenId}</span>
                <span className="tc-serving-name">{servingToken.name}</span>
                <span className="tc-serving-people">👥 {servingToken.people} people</span>
                {servingToken.enteredAt && (
                  <span className="tc-serving-time">
                    🟢 Entered: {servingToken.enteredAt?.toDate
                      ? servingToken.enteredAt.toDate().toLocaleTimeString()
                      : new Date(servingToken.enteredAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
            <button className="tc-call-btn" onClick={callNext} disabled={calling || waitingTokens.length === 0}>
              {calling ? 'Calling...' : waitingTokens.length === 0 ? 'No Tokens in Queue' : `📢 Call Next — ${waitingTokens[0]?.tokenId}`}
            </button>

            {/* Queue list */}
            <div className="tc-queue">
              <h3>Waiting Queue</h3>
              {waitingTokens.length === 0 ? (
                <p className="tc-queue-empty">Queue is empty</p>
              ) : waitingTokens.slice(0, 8).map((t, i) => (
                <div key={t.id} className="tc-queue-item">
                  <span className="tc-queue-token">{t.tokenId}</span>
                  <span className="tc-queue-name">{t.name}</span>
                  {t.wristbandId && <span style={{fontSize:'.72rem',color:t.wristbandColor,fontWeight:700}}>{t.wristbandId}</span>}
                  <span className="tc-queue-wait">~{i * AVG_MINS} mins</span>
                </div>
              ))}
            </div>

            {/* Completed log */}
            {tokens.filter(t => t.status === 'DONE' && t.enteredAt).length > 0 && (
              <div className="tc-queue" style={{marginTop:'1rem'}}>
                <h3>Completed Today</h3>
                {tokens.filter(t => t.status === 'DONE' && t.enteredAt).slice(-5).reverse().map(t => (
                  <div key={t.id} className="tc-queue-item tc-done-item">
                    <span className="tc-queue-token" style={{color:'#2dc653'}}>{t.tokenId}</span>
                    <span className="tc-queue-name">{t.name}</span>
                    <span className="tc-queue-wait">
                      {t.durationMins != null
                        ? t.durationMins >= 60
                          ? `${Math.floor(t.durationMins/60)}h ${t.durationMins%60}m`
                          : `${t.durationMins}m inside`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
