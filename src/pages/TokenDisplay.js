import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/TokenDisplay.css';

const TODAY = new Date().toISOString().split('T')[0];
const AVG_MINS = 5;

export default function TokenDisplay() {
  const [tokens,       setTokens]       = useState([]);
  const [onlineInside, setOnlineInside] = useState(0);
  const [time,         setTime]         = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tokens'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const today = all.filter(t => t.date === TODAY);
      today.sort((a, b) => a.tokenNumber - b.tokenNumber);
      setTokens(today);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), snap => {
      const today = new Date().toISOString().split('T')[0];
      const inside = snap.docs.map(d => d.data())
        .filter(b => b.status === 'CHECKED_IN' && b.visitDateTime?.startsWith(today));
      setOnlineInside(inside.length);
    });
    return () => unsub();
  }, []);

  const servingToken  = tokens.find(t => t.status === 'SERVING');
  const waitingTokens = tokens.filter(t => t.status === 'WAITING');
  const estimatedWait = (waitingTokens.length + onlineInside) * AVG_MINS;

  return (
    <div className="td-root">
      {/* Header */}
      <div className="td-header">
        <div className="td-logo">🕉️ KumbhSaarthi</div>
        <div className="td-clock">
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="td-date">
          {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Now Serving */}
      <div className="td-serving-section">
        <p className="td-serving-label">NOW SERVING</p>
        <div className={`td-serving-token ${servingToken ? 'td-token-active' : ''}`}>
          {servingToken ? servingToken.tokenId : '—'}
        </div>
        {servingToken && (
          <p className="td-serving-name">{servingToken.name !== 'Walk-in Visitor' ? servingToken.name : ''}</p>
        )}
      </div>

      {/* Queue */}
      <div className="td-queue-section">
        <h2 className="td-queue-title">Next in Queue</h2>
        {waitingTokens.length === 0 ? (
          <div className="td-queue-empty">✅ No waiting visitors</div>
        ) : (
          <div className="td-queue-list">
            {waitingTokens.slice(0, 6).map((t, i) => (
              <div key={t.id} className={`td-queue-item ${i === 0 ? 'td-queue-next' : ''}`}>
                <span className="td-q-token">{t.tokenId}</span>
                <span className="td-q-people">👥 {t.people}</span>
                <span className="td-q-wait">~{(i + 1) * AVG_MINS} min wait</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="td-footer">
        <span>🧍 {waitingTokens.length} visitors waiting</span>
        <span>⏱️ Avg wait: {estimatedWait} mins</span>
        <span>Please wait for your token to be called</span>
      </div>
    </div>
  );
}
