import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/DailyLimits.css';

const DEFAULT_ONLINE  = 400;
const DEFAULT_OFFLINE = 100;

function DailyLimits() {
  const [limits,     setLimits]     = useState({});
  const [bookings,   setBookings]   = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [customDate, setCustomDate] = useState('');

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const extraDates = Object.keys(limits)
    .filter(k => !k.startsWith('offline_') && !days.includes(k))
    .sort();
  const allDates = [...days, ...extraDates];

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'dailyLimits'), snap => {
      if (snap.exists()) setLimits(snap.data());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), snap => {
      setBookings(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, []);

  const getOnline  = (date) => limits[date]              ?? DEFAULT_ONLINE;
  const getOffline = (date) => limits[`offline_${date}`] ?? DEFAULT_OFFLINE;
  const getTotal   = (date) => getOnline(date) + getOffline(date);

  const setOnline = (date, val) => {
    const total   = getTotal(date);
    const online  = Math.min(Math.max(0, val), total);
    const offline = total - online;
    setLimits(prev => ({ ...prev, [date]: online, [`offline_${date}`]: offline }));
  };

  const setOffline = (date, val) => {
    const total   = getTotal(date);
    const offline = Math.min(Math.max(0, val), total);
    const online  = total - offline;
    setLimits(prev => ({ ...prev, [date]: online, [`offline_${date}`]: offline }));
  };

  const setTotal = (date, val) => {
    const newTotal  = Math.max(1, val);
    const ratio     = getOnline(date) / (getTotal(date) || 1);
    const newOnline = Math.round(newTotal * ratio);
    setLimits(prev => ({
      ...prev,
      [date]: newOnline,
      [`offline_${date}`]: newTotal - newOnline
    }));
  };

  const getBookingsForDay = (date) =>
    bookings.filter(b => {
      if (!b.visitDateTime || b.status === 'CANCELLED') return false;
      return b.visitDateTime.startsWith(date);
    }).reduce((sum, b) => sum + (parseInt(b.numberOfPeople) || 1), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'dailyLimits'), limits);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="dl-root">
      <div className="dl-inner">
        <h1 className="dl-title">Daily Pass Limits</h1>
        <p className="dl-subtitle">Set total capacity per day — split between Online & Offline (Walk-in). Online + Offline = Total.</p>

        <div className="dl-add-date">
          <input type="date" value={customDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setCustomDate(e.target.value)} />
          <button onClick={() => {
            if (customDate && limits[customDate] === undefined) {
              setLimits(prev => ({ ...prev, [customDate]: DEFAULT_ONLINE, [`offline_${customDate}`]: DEFAULT_OFFLINE }));
              setCustomDate('');
            }
          }}>+ Add Date</button>
        </div>

        <div className="dl-grid">
          {allDates.map(date => {
            const online  = getOnline(date);
            const offline = getOffline(date);
            const total   = online + offline;
            const booked  = getBookingsForDay(date);
            const pct     = Math.min((booked / total) * 100, 100);
            const color   = pct >= 90 ? '#ff4d6d' : pct >= 70 ? '#f4a261' : '#2dc653';

            return (
              <div className="dl-card" key={date}>
                <div className="dl-card-header">
                  <span className="dl-date">{formatDate(date)}</span>
                  <span className="dl-date-full">{date}</span>
                </div>

                <div className="dl-stats">
                  <span style={{ color }}>{booked} booked</span>
                  <span>/ {total} total</span>
                </div>

                <div className="dl-bar">
                  <div style={{ width: `${pct}%`, background: color }} />
                </div>

                {/* Total capacity */}
                <div className="dl-input-row">
                  <label>Total Capacity</label>
                  <input type="number" min="1" max="10000" value={total}
                    onChange={e => setTotal(date, parseInt(e.target.value) || 1)} />
                </div>

                {/* Online */}
                <div className="dl-input-row">
                  <label>🌐 Online</label>
                  <input type="number" min="0" max={total} value={online}
                    onChange={e => setOnline(date, parseInt(e.target.value) || 0)} />
                </div>

                {/* Offline */}
                <div className="dl-input-row">
                  <label>🚶 Walk-in</label>
                  <input type="number" min="0" max={total} value={offline}
                    onChange={e => setOffline(date, parseInt(e.target.value) || 0)} />
                </div>

                <div className="dl-total-row">
                  🌐 {online} Online + 🚶 {offline} Walk-in = <strong>{total}</strong>
                </div>
              </div>
            );
          })}
        </div>

        <button className="dl-btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save All Limits'}
        </button>
      </div>
    </div>
  );
}

export default DailyLimits;
