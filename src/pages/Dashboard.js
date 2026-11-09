import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/Dashboard.css';

const CAPACITY = 500;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
const HOUR_RANGES = [6, 8, 10, 12, 14, 16, 18];

function AnimatedNumber({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = display;
    const to = value;

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]); // eslint-disable-line

  return <>{display.toLocaleString()}</>;
}

const getStatus = (pct) =>
  pct >= 90 ? 'CRITICAL' : pct >= 70 ? 'HIGH' : pct >= 50 ? 'MODERATE' : 'LOW';

const STATUS_META = {
  CRITICAL: { color: '#ff4d6d', bg: 'rgba(255,77,109,0.12)',  pulse: true,  icon: '🚨' },
  HIGH:     { color: '#f4a261', bg: 'rgba(244,162,97,0.12)',  pulse: true,  icon: '⚠️' },
  MODERATE: { color: '#4cc9f0', bg: 'rgba(76,201,240,0.12)', pulse: false, icon: '📊' },
  LOW:      { color: '#2dc653', bg: 'rgba(45,198,83,0.12)',  pulse: false, icon: '✅' },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function Dashboard() {
  const [visitors, setVisitors]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [mounted, setMounted]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [onlineLimit, setOnlineLimit]   = useState(400);
  const [offlineLimit, setOfflineLimit] = useState(100);
  const [tokensUsed, setTokensUsed]     = useState(0);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['admin','manager'].includes(user.role);

  const TODAY = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    const unsub = onSnapshot(collection(db, 'bookings'), (snap) => {
      setVisitors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastUpdate(new Date());
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'dailyLimits'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setOnlineLimit(data[TODAY] ?? 400);
        setOfflineLimit(data[`offline_${TODAY}`] ?? 100);
      }
    });
    return () => unsub();
  }, [TODAY]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tokens'), snap => {
      const today = snap.docs.map(d => d.data()).filter(t => t.date === TODAY && t.status !== 'DONE');
      setTokensUsed(today.length);
    });
    return () => unsub();
  }, [TODAY]);

  const today      = new Date();
  const checkedIn  = visitors.filter(v => v.status === 'CHECKED_IN').length;
  const checkedOut = visitors.filter(v => v.status === 'CHECKED_OUT').length;
  const registered = visitors.filter(v => v.status === 'REGISTERED').length;
  const onlineBooked = checkedIn + checkedOut + registered;
  const onlineSlotsLeft = Math.max(0, onlineLimit - onlineBooked);
  const percentage = +((onlineBooked / onlineLimit) * 100).toFixed(1);
  const status     = getStatus(percentage);
  const meta       = STATUS_META[status];

  const hourlyData = HOURS.map((label, i) => ({
    time: label,
    visitors: visitors.filter(v => {
      if (!v.visitDateTime) return false;
      const d = new Date(v.visitDateTime);
      return (
        d.toDateString() === today.toDateString() &&
        d.getHours() >= HOUR_RANGES[i] &&
        d.getHours() < (HOUR_RANGES[i + 1] || 20)
      );
    }).length,
  }));

  const weeklyData = DAYS.map((day, i) => ({
    day,
    visitors: visitors.filter(v => {
      if (!v.visitDateTime) return false;
      return new Date(v.visitDateTime).getDay() === i;
    }).length,
  }));

  const pieData = [
    { name: 'Checked In',  value: checkedIn || 0,  color: '#7c3aed' },
    { name: 'Checked Out', value: checkedOut || 0, color: '#4cc9f0' },
    { name: 'Registered',  value: registered || 0, color: '#f4a261' },
    { name: 'Available',   value: Math.max(0, CAPACITY - checkedIn - checkedOut - registered), color: '#1e1e3a' },
  ];

  const offlineSlotsLeft = Math.max(0, offlineLimit - tokensUsed);

  const STAT_CARDS = isAdmin ? [
    { icon: '👥', label: 'Current Occupancy',   value: checkedIn,        sub: 'Live',             accent: '#7c3aed' },
    { icon: '🌐', label: 'Online Limit',        value: onlineLimit,      sub: 'Set by admin',     accent: '#4cc9f0' },
    { icon: '🎫', label: 'Online Slots Left',   value: onlineSlotsLeft,  sub: 'Available online', accent: '#e040fb' },
    { icon: '🚶', label: 'Walk-in Limit',       value: offlineLimit,     sub: 'Token slots',      accent: '#f4a261' },
    { icon: '🎫', label: 'Walk-in Slots Left',  value: offlineSlotsLeft, sub: 'Token available',  accent: '#2dc653' },
    { icon: '✅', label: 'Completed Visits',    value: checkedOut,       sub: 'Today total',      accent: '#2dc653' },
  ] : [
    { icon: '👥', label: 'Current Occupancy',   value: checkedIn,        sub: 'Live',             accent: '#7c3aed' },
    { icon: '🌐', label: 'Online Limit Today',  value: onlineLimit,      sub: 'Set by admin',     accent: '#4cc9f0' },
    { icon: '📈', label: 'Occupancy Rate',      value: null, pct: percentage, sub: 'Online',       accent: meta.color },
    { icon: '✅', label: 'Completed Visits',    value: checkedOut,       sub: 'Today total',      accent: '#2dc653' },
    { icon: '📋', label: 'Pending',             value: registered,       sub: 'Yet to arrive',    accent: '#f4a261' },
    { icon: '🎫', label: 'Online Slots Left',   value: onlineSlotsLeft,  sub: 'Available online', accent: '#e040fb' },
  ];

  return (
    <div className={`db-root ${mounted ? 'db-mounted' : ''}`}>
      <div className="db-orb db-orb-1" />
      <div className="db-orb db-orb-2" />
      <div className="db-orb db-orb-3" />

      <div className="db-inner">
        <header className="db-header">
          <div className="db-title-block">
            <span className="db-eyebrow">Live Dashboard</span>
            <h1 className="db-title">Crowd Management</h1>
          </div>
          <div className="db-live-badge">
            <span className="db-live-dot" />
            <span>LIVE</span>
            <span className="db-last-updated">
              Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>

        <div
          className={`db-status-banner ${meta.pulse ? 'db-pulse' : ''}`}
          style={{ background: meta.bg, borderColor: meta.color }}
        >
          <span className="db-status-icon">{meta.icon}</span>
          <div className="db-status-text">
            <strong style={{ color: meta.color }}>STATUS: {status}</strong>
            <span>{onlineBooked} of {onlineLimit} online slots filled ({percentage}%)</span>
          </div>
          <div className="db-capacity-mini">
            <div
              className="db-capacity-mini-fill"
              style={{ width: `${percentage}%`, background: meta.color }}
            />
          </div>
        </div>

        {loading && (
          <div className="db-loading">
            <div className="db-spinner" />
            <span>Connecting to Firestore…</span>
          </div>
        )}

        <div className="db-stats-grid">
          {STAT_CARDS.map((card, i) => (
            <div
              className="db-stat-card"
              key={i}
              style={{ '--accent': card.accent, animationDelay: `${i * 80}ms` }}
            >
              <div className="db-stat-icon">{card.icon}</div>
              <div className="db-stat-body">
                <p className="db-stat-label">{card.label}</p>
                <p className="db-stat-val">
                  {card.pct !== undefined
                    ? <><AnimatedNumber value={card.pct} />%</>
                    : <AnimatedNumber value={card.value} />
                  }
                </p>
                <p className="db-stat-sub">{card.sub}</p>
              </div>
              <div className="db-stat-accent-bar" />
            </div>
          ))}
        </div>

        <div className="db-charts-row">
          <div className="db-chart-card db-chart-wide">
            <div className="db-chart-header">
              <h3>Hourly Visitor Trend</h3>
              <span className="db-chart-badge">Today</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" tick={{ fill: '#8b8bb5', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8b8bb5', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="visitors" name="Visitors"
                  stroke="#7c3aed" strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#a78bfa' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="db-chart-card">
            <div className="db-chart-header">
              <h3>Capacity Split</h3>
              <span className="db-chart-badge">Now</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData.filter(d => d.value > 0)}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(val) => <span style={{ color: '#8b8bb5', fontSize: 12 }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="db-charts-row">
          <div className="db-chart-card db-chart-wide">
            <div className="db-chart-header">
              <h3>Weekly Visitor Statistics</h3>
              <span className="db-chart-badge">This Week</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#4cc9f0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#8b8bb5', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8b8bb5', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="visitors" name="Visitors" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="db-chart-card db-quick-panel">
            <div className="db-chart-header">
              <h3>Quick Stats</h3>
            </div>
            <div className="db-quick-list">
              {(isAdmin ? [
                { label: 'Total Bookings',    val: visitors.length,  icon: '📁', color: '#7c3aed' },
                { label: 'Checked In',        val: checkedIn,        icon: '✅', color: '#2dc653' },
                { label: 'Completed Visits',  val: checkedOut,       icon: '🏁', color: '#4cc9f0' },
                { label: 'Online Slots Left', val: onlineSlotsLeft,  icon: '🌐', color: '#e040fb' },
                { label: 'Walk-in Slots Left',val: offlineSlotsLeft, icon: '🚶', color: '#f4a261' },
              ] : [
                { label: 'Total Bookings',    val: visitors.length,  icon: '📁', color: '#7c3aed' },
                { label: 'Checked In',        val: checkedIn,        icon: '✅', color: '#2dc653' },
                { label: 'Completed Visits',  val: checkedOut,       icon: '🏁', color: '#4cc9f0' },
                { label: 'Pending Arrivals',  val: registered,       icon: '⏳', color: '#f4a261' },
                { label: 'Online Slots Left', val: onlineSlotsLeft,  icon: '🎫', color: '#e040fb' },
              ]).map((item, i) => (
                <div className="db-quick-row" key={i} style={{ '--qcolor': item.color }}>
                  <span className="db-quick-icon">{item.icon}</span>
                  <span className="db-quick-label">{item.label}</span>
                  <span className="db-quick-val" style={{ color: item.color }}>
                    <AnimatedNumber value={item.val} />
                  </span>
                </div>
              ))}
            </div>

            <div className="db-cap-section">
              <div className="db-cap-row">
                <span>Occupancy</span>
                <span style={{ color: meta.color }}>{percentage}%</span>
              </div>
              <div className="db-cap-bar">
                <div
                  className="db-cap-fill"
                  style={{ width: `${percentage}%`, background: meta.color }}
                />
              </div>
              <div className="db-cap-labels">
                <span>0</span><span>{Math.round(onlineLimit/2)}</span><span>{onlineLimit}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
