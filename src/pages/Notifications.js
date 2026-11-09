import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/Notifications.css';

// ── Live timer component ──
function AlertTimer({ timestamp }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const base = timestamp?.toDate ? timestamp.toDate().getTime() : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - base) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timestamp]);
  const mins  = Math.floor(elapsed / 60);
  const secs  = elapsed % 60;
  const level = elapsed < 180 ? 'normal' : elapsed < 300 ? 'warning' : 'critical';
  return (
    <span className={`ec-timer ec-timer-${level}`}>
      ⏱️ {mins}m {secs}s
      {level === 'warning'  && ' — ⚠️ Unattended'}
      {level === 'critical' && ' — 🔴 CRITICAL'}
    </span>
  );
}

// ── Lockdown countdown ──
function LockdownCountdown({ onDone }) {
  const [secs, setSecs] = useState(60);
  useEffect(() => {
    if (secs <= 0) { onDone(); return; }
    const id = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs, onDone]);
  return (
    <div className="ld-countdown">
      <div className="ld-countdown-ring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#ff4d6d" strokeWidth="8"
            strokeDasharray={`${(secs / 60) * 276.5} 276.5`}
            strokeLinecap="round" transform="rotate(-90 50 50)" />
        </svg>
        <span className="ld-countdown-num">{secs}</span>
      </div>
      <p>seconds until auto-escalation</p>
    </div>
  );
}

// ── Alarm sound ──
const playAlarm = () => {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, start, dur) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    play(880, 0,    0.15);
    play(660, 0.2,  0.15);
    play(880, 0.4,  0.15);
    play(440, 0.6,  0.3);
  } catch (e) { /* silent */ }
};

function Notifications() {
  const [alerts,       setAlerts]       = useState([]);
  const [filter,       setFilter]       = useState('ALL');
  const [lockdown,     setLockdown]     = useState(null); // alert object
  const [handling,     setHandling]     = useState(false);
  const prevCountRef   = useRef(0);
  const lockdownRef    = useRef(null);
  const alarmIntervalRef = useRef(null);

  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role && user.role !== 'visitor';
  const isAdminRef = useRef(isAdmin);

  const getElapsed = (alert) =>
    Math.floor((Date.now() - (alert.timestamp?.toDate ? alert.timestamp.toDate().getTime() : Date.now())) / 1000);

  const getEscalationLevel = useCallback((alert) => {
    if (alert.read) return 'resolved';
    const secs = getElapsed(alert);
    if (secs >= 600) return 'lockdown';
    if (secs >= 300) return 'critical';
    if (secs >= 180) return 'warning';
    return 'active';
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isAdminRef.current) return;
    const unsub = onSnapshot(collection(db, 'alerts'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setAlerts(data);
      const activeCount = data.filter(a => !a.read).length;
      if (activeCount > prevCountRef.current) playAlarm();
      prevCountRef.current = activeCount;
    });
    return () => unsub();
  }, [isAdminRef]);

  // check for lockdown every 10s
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isAdminRef.current) return;
    const id = setInterval(() => {
      const lockdownAlert = alerts.find(a => !a.read && !a.dispatched && getElapsed(a) >= 600);
      if (lockdownAlert && !lockdownRef.current) {
        lockdownRef.current = lockdownAlert.id;
        setLockdown(lockdownAlert);
        playAlarm();
        // repeat alarm every 8s while in lockdown
        alarmIntervalRef.current = setInterval(playAlarm, 8000);
      }
    }, 10000);
    return () => clearInterval(id);
  }, [alerts]);

  const handleLockdownAck = async () => {
    setHandling(true);
    clearInterval(alarmIntervalRef.current);
    if (lockdown) {
      await updateDoc(doc(db, 'alerts', lockdown.id), {
        dispatched: true, dispatchedAt: new Date(),
        dispatchedBy: user.name || user.role,
        lockdownAcknowledged: true,
      });
    }
  };

  const handleLockdownDone = () => {
    setLockdown(null);
    setHandling(false);
    lockdownRef.current = null;
  };

  const dispatch   = async (id) => await updateDoc(doc(db, 'alerts', id), { dispatched: true, dispatchedAt: new Date(), dispatchedBy: user.name || user.role });
  const resolve    = async (id) => await updateDoc(doc(db, 'alerts', id), { read: true, resolvedAt: new Date(), resolvedBy: user.name || user.role });
  const resolveAll = () => alerts.filter(a => !a.read).forEach(a => resolve(a.id));

  const activeAlerts = alerts.filter(a => !a.read);
  const filtered = filter === 'ALL' ? alerts : filter === 'UNREAD' ? alerts.filter(a => !a.read) : alerts.filter(a => a.read);

  if (!isAdmin) return (
    <div className="notifications-page">
      <div className="container">
        <h1 className="page-title">🚨 Emergency Center</h1>
        <p style={{color:'#8b8bb5',textAlign:'center',padding:'3rem'}}>Only accessible by admin/staff/manager.</p>
      </div>
    </div>
  );

  return (
    <div className={`notifications-page ${lockdown ? 'ec-lockdown-mode' : ''}`}>

      {/* ── LOCKDOWN OVERLAY ── */}
      {lockdown && (
        <div className="ld-overlay">
          <div className="ld-modal">
            <div className="ld-flash-ring" />
            <div className="ld-icon">🔴</div>
            <div className="ld-label">CRITICAL EMERGENCY</div>
            <h1 className="ld-title">VISITOR IN DANGER</h1>
            <div className="ld-visitor-name">{lockdown.visitorName}</div>
            <div className="ld-zone">📍 {lockdown.locationStr}</div>
            <p className="ld-desc">This alert has been <strong>unattended for over 10 minutes.</strong><br />Immediate action is required. You cannot dismiss this.</p>

            {!handling ? (
              <button className="ld-ack-btn" onClick={handleLockdownAck}>
                🏃 I'M HANDLING THIS
              </button>
            ) : (
              <>
                <div className="ld-handling-msg">✅ Acknowledged — Get to the visitor now!</div>
                <LockdownCountdown onDone={handleLockdownDone} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Critical banner */}
      {!lockdown && activeAlerts.some(a => getEscalationLevel(a) === 'critical') && (
        <div className="ec-critical-banner">
          🔴 CRITICAL — One or more alerts unattended for over 5 minutes! Immediate action required.
        </div>
      )}

      {/* Warning banner */}
      {!lockdown && !activeAlerts.some(a => getEscalationLevel(a) === 'critical') &&
        activeAlerts.some(a => getEscalationLevel(a) === 'warning') && (
        <div className="ec-warning-banner">
          ⚠️ WARNING — Some alerts have been unattended for over 3 minutes!
        </div>
      )}

      <div className="container">
        <div className="ec-header-row">
          <h1 className="page-title">🚨 Emergency Center</h1>
          {activeAlerts.length > 0 && (
            <div className="ec-live-badge">
              <span className="ec-live-dot" />
              {activeAlerts.length} ACTIVE
            </div>
          )}
        </div>

        <div className="notifications-header">
          <div className="notification-tabs">
            <button className={`tab ${filter==='ALL'    ? 'active':''}`} onClick={() => setFilter('ALL')}>All ({alerts.length})</button>
            <button className={`tab ${filter==='UNREAD' ? 'active':''}`} onClick={() => setFilter('UNREAD')}>Active ({activeAlerts.length})</button>
            <button className={`tab ${filter==='READ'   ? 'active':''}`} onClick={() => setFilter('READ')}>Resolved</button>
          </div>
          <button className="btn-mark-read" onClick={resolveAll}>Resolve All</button>
        </div>

        <div className="notifications-list">
          {filtered.length === 0 ? (
            <div className="ec-empty"><span>✅</span><p>No active alerts. All clear!</p></div>
          ) : filtered.map(alert => {
            const level = getEscalationLevel(alert);
            return (
              <div key={alert.id} className={`notification-item panic-alert ec-alert-${level}`}>
                <div className={`ec-alert-icon ${level !== 'resolved' ? `ec-icon-pulse-${level}` : ''}`}>
                  {level === 'lockdown' ? '🔴' : level === 'critical' ? '🔴' : level === 'warning' ? '⚠️' : level === 'resolved' ? '✅' : '🚨'}
                </div>
                <div className="notification-content">
                  {level === 'lockdown'  && <span className="ec-escalation-badge ec-badge-lockdown">🔴 LOCKDOWN — 10+ MINS</span>}
                  {level === 'critical'  && <span className="ec-escalation-badge ec-badge-critical">🔴 CRITICAL — UNATTENDED</span>}
                  {level === 'warning'   && <span className="ec-escalation-badge ec-badge-warning">⚠️ UNATTENDED</span>}
                  {level === 'active'    && <span className="ec-escalation-badge ec-badge-active">🚨 ACTIVE</span>}
                  {level === 'resolved'  && <span className="ec-escalation-badge ec-badge-resolved">✅ RESOLVED</span>}

                  <h4>PANIC ALERT — {alert.visitorName || 'Unknown Visitor'}</h4>
                  <p style={{fontSize:'.8rem',color:'#8b8bb5'}}>{alert.visitorEmail}</p>
                  <div className="ec-zone-tag">📍 {alert.locationStr || 'Location unavailable'}</div>
                  {!alert.read && <AlertTimer timestamp={alert.timestamp} />}

                  <div className="ec-meta-row">
                    <span className="notification-time">🕐 {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleString() : 'Just now'}</span>
                    {alert.dispatched && <span className="ec-dispatched-info">🏃 Dispatched by {alert.dispatchedBy} at {alert.dispatchedAt?.toDate ? alert.dispatchedAt.toDate().toLocaleTimeString() : '—'}</span>}
                    {alert.read && alert.resolvedBy && <span className="ec-dispatched-info">✅ Resolved by {alert.resolvedBy}</span>}
                  </div>
                </div>

                <div className="ec-alert-action">
                  {!alert.read && (
                    <div className="ec-action-btns">
                      {!alert.dispatched && <button className="ec-dispatch-btn" onClick={() => dispatch(alert.id)}>🏃 Dispatch</button>}
                      {alert.dispatched  && <span className="ec-dispatched-badge">🏃 Dispatched</span>}
                      <button className="ec-resolve-btn" onClick={() => resolve(alert.id)}>✔ Resolve</button>
                    </div>
                  )}
                  {alert.read && <span className="ec-resolved-badge">✓ Resolved</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
