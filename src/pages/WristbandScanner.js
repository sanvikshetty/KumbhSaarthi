import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/WristbandScanner.css';

export default function WristbandScanner() {
  const [active,     setActive]     = useState(false);
  const [input,      setInput]      = useState('');
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // sync with Firestore — shared with TokenCounter
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'wristbandMode'), snap => {
      if (snap.exists()) setActive(snap.data().enabled ?? false);
    });
    return () => unsub();
  }, []);

  const handleToggle = async () => {
    const next = !active;
    setActive(next);
    setResult(null); setError(''); setInput('');
    try { await setDoc(doc(db, 'settings', 'wristbandMode'), { enabled: next }); } catch {}
  };

  const search = async () => {
    const val = input.trim().toUpperCase();
    if (!val) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const q1 = query(collection(db, 'tokens'), where('wristbandId', '==', val));
      const q2 = query(collection(db, 'tokens'), where('tokenId',     '==', val));
      let snap = await getDocs(q1);
      if (snap.empty) snap = await getDocs(q2);
      if (snap.empty) {
        setError(`No visitor found for "${val}". Check the wristband/token ID.`);
      } else {
        setResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) { setError('Search failed. Try again.'); }
    setLoading(false);
  };

  const markExit = async () => {
    setProcessing(true);
    const now = new Date();
    try {
      const enteredAt = result.enteredAt?.toDate ? result.enteredAt.toDate()
        : result.enteredAt ? new Date(result.enteredAt) : null;
      const durationMins = enteredAt ? Math.round((now - enteredAt) / 60000) : null;
      await updateDoc(doc(db, 'tokens', result.id), {
        status: 'DONE', exitedAt: now,
        ...(durationMins !== null && { durationMins })
      });
      setResult(prev => ({ ...prev, status: 'DONE', exitedAt: now, durationMins }));
      showToast(`✅ ${result.name} marked as exited!`);
    } catch (e) { showToast('❌ Failed. Try again.', 'error'); }
    setProcessing(false);
  };

  const reset = () => { setInput(''); setResult(null); setError(''); };

  const getStatusColor = (s) =>
    s === 'SERVING' ? '#2dc653' : s === 'DONE' ? '#4cc9f0' : '#f4a261';

  return (
    <div className="wb-root">
      {toast && <div className={`wb-toast wb-toast-${toast.type}`}>{toast.msg}</div>}

      <div className="wb-inner">
        <h1 className="wb-title">🎗️ Wristband Scanner</h1>
        <p className="wb-subtitle">Enter wristband or token ID to track visitor exit</p>

        {/* Runtime ON/OFF toggle */}
        <div className="wb-toggle-card">
          <div className="wb-toggle-info">
            <span className="wb-toggle-label">{active ? '🟢 Wristband Mode Active' : '⚫ Wristband Mode Off'}</span>
            <span className="wb-toggle-hint">
              {active ? 'Wristbands are being issued & tracked' : 'Turn on when crowd needs wristband tracking'}
            </span>
          </div>
          <button className={`wb-toggle-btn ${active ? 'wb-toggle-on' : 'wb-toggle-off'}`} onClick={handleToggle}>
            {active ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>

        {!active && (
          <div className="wb-inactive-msg">
            🎗️ Wristband mode is <strong>off</strong>. Turn it on when you decide tracking is needed for today's crowd.
          </div>
        )}

        {active && (
          <>
            <div className="wb-search-card">
              <div className="wb-search-row">
                <input
                  className="wb-input"
                  value={input}
                  onChange={e => setInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder="Enter Wristband ID (e.g. W001) or Token ID (e.g. T001)"
                  maxLength={10}
                />
                <button className="wb-search-btn" onClick={search} disabled={loading || !input.trim()}>
                  {loading ? '...' : '🔍 Search'}
                </button>
              </div>
              {error && <div className="wb-error">⚠️ {error}</div>}
            </div>

            {result && (
              <div className="wb-result-card">
                <div className="wb-wristband-bar" style={{ background: result.wristbandColor || '#f4a261' }} />

                <div className="wb-result-header">
                  <div>
                    <h2>{result.name}</h2>
                    <span className="wb-status-badge" style={{
                      color: getStatusColor(result.status),
                      background: `${getStatusColor(result.status)}18`,
                      borderColor: getStatusColor(result.status)
                    }}>
                      {result.status === 'DONE' ? 'EXITED' : result.status === 'SERVING' ? 'INSIDE' : 'WAITING'}
                    </span>
                  </div>
                  <div className="wb-ids">
                    <span className="wb-id-badge" style={{color: result.wristbandColor || '#f4a261'}}>
                      🎗️ {result.wristbandId || '—'}
                    </span>
                    <span className="wb-id-badge" style={{color:'#a78bfa'}}>
                      🎫 {result.tokenId}
                    </span>
                  </div>
                </div>

                <div className="wb-details">
                  <div className="wb-detail-row"><span>Phone</span><strong>{result.phone}</strong></div>
                  <div className="wb-detail-row"><span>People</span><strong>{result.people}</strong></div>
                  <div className="wb-detail-row"><span>Wristband</span><strong style={{color: result.wristbandColor}}>{result.wristbandLabel || '—'}</strong></div>
                  <div className="wb-detail-row"><span>Issued At</span><strong>{result.issuedAt?.toDate ? result.issuedAt.toDate().toLocaleTimeString() : '—'}</strong></div>
                  {result.enteredAt && (
                    <div className="wb-detail-row">
                      <span>🟢 Entered At</span>
                      <strong style={{color:'#2dc653'}}>
                        {result.enteredAt?.toDate ? result.enteredAt.toDate().toLocaleTimeString() : new Date(result.enteredAt).toLocaleTimeString()}
                      </strong>
                    </div>
                  )}
                  {result.exitedAt && (
                    <div className="wb-detail-row">
                      <span>🔴 Exited At</span>
                      <strong style={{color:'#4cc9f0'}}>
                        {result.exitedAt?.toDate ? result.exitedAt.toDate().toLocaleTimeString() : new Date(result.exitedAt).toLocaleTimeString()}
                      </strong>
                    </div>
                  )}
                  {result.durationMins != null && (
                    <div className="wb-detail-row">
                      <span>⏱️ Time Inside</span>
                      <strong style={{color:'#f4a261'}}>
                        {result.durationMins >= 60
                          ? `${Math.floor(result.durationMins/60)}h ${result.durationMins%60}m`
                          : `${result.durationMins} mins`}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="wb-actions">
                  {result.status !== 'DONE' && (
                    <button className="wb-btn-exit" onClick={markExit} disabled={processing}>
                      {processing ? '...' : '🔴 Mark Exit'}
                    </button>
                  )}
                  {result.status === 'DONE' && (
                    <div className="wb-completed">✓ Visitor has exited</div>
                  )}
                  <button className="wb-btn-reset" onClick={reset}>Search Another</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
