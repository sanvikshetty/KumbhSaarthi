import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { PUJAS } from './PujaBooking';
import '../styles/PujaAdmin.css';

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

const STATUS_COLORS = {
  PENDING:   { color: '#f4a261', bg: 'rgba(244,162,97,.12)'  },
  CONFIRMED: { color: '#4cc9f0', bg: 'rgba(76,201,240,.12)'  },
  COMPLETED: { color: '#2dc653', bg: 'rgba(45,198,83,.12)'   },
  CANCELLED: { color: '#ff4d6d', bg: 'rgba(255,77,109,.12)'  },
};

export default function PujaAdmin() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('ALL');
  const [search, setSearch]     = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'pujaBookings'), orderBy('createdAt', 'desc')));
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    const now = new Date();
    const updateData = { status };
    if (status === 'CONFIRMED')  updateData.confirmedAt  = now;
    if (status === 'COMPLETED')  updateData.completedAt  = now;
    if (status === 'CANCELLED')  updateData.cancelledAt  = now;
    try {
      await updateDoc(doc(db, 'pujaBookings', id), updateData);
      if (status === 'CANCELLED') {
        const b = bookings.find(x => x.id === id);
        await addDoc(collection(db, 'visitorMessages'), {
          bookingId: b.bookingId, type: 'PUJA', visitorName: b.name, phone: b.phone,
          message: `Your ${b.pujaName} booking (${b.bookingId}) has been cancelled by the authorities. ${
            b.paymentMode === 'online'
              ? `A refund of ₹${b.pujaPrice?.toLocaleString('en-IN')} has been initiated and will be processed shortly.`
              : 'No payment was collected.'
          }`,
          read: false, createdAt: new Date()
        });
      }
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updateData } : b));
    } catch { }
    setUpdating(null);
  };

  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'ALL' || b.status === filter;
    const matchSearch = !search || b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingId?.toLowerCase().includes(search.toLowerCase()) ||
      b.pujaName?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = STATUSES.slice(1).reduce((acc, s) => {
    acc[s] = bookings.filter(b => b.status === s).length;
    return acc;
  }, {});

  return (
    <div className="pa-root">
      <div className="pa-inner">
        <div className="pa-header">
          <div>
            <h1 className="pa-title">🪔 Puja Bookings</h1>
            <p className="pa-subtitle">Manage all special puja bookings</p>
          </div>
          <button className="pa-refresh" onClick={fetchBookings}>↻ Refresh</button>
        </div>

        {/* Summary Cards */}
        <div className="pa-summary">
          {STATUSES.slice(1).map(s => (
            <div key={s} className="pa-summary-card" style={{ borderColor: STATUS_COLORS[s].color, background: STATUS_COLORS[s].bg }}>
              <span className="pa-summary-count" style={{ color: STATUS_COLORS[s].color }}>{counts[s] || 0}</span>
              <span className="pa-summary-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="pa-controls">
          <div className="pa-filters">
            {STATUSES.map(s => (
              <button key={s} className={`pa-filter-btn ${filter === s ? 'pa-filter-active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
          <input className="pa-search" placeholder="Search by name, ID or puja..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="pa-loading"><div className="pa-spinner" /><p>Loading bookings...</p></div>
        ) : filtered.length === 0 ? (
          <div className="pa-empty">🪔 No bookings found</div>
        ) : (
          <div className="pa-table-wrap">
            <table className="pa-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Visitor</th>
                  <th>Puja</th>
                  <th>Date & Time</th>
                  <th>People</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const sc = STATUS_COLORS[b.status] || STATUS_COLORS.PENDING;
                  const puja = PUJAS.find(p => p.id === b.pujaId);
                  return (
                    <tr key={b.id}>
                      <td><span className="pa-booking-id">{b.bookingId}</span></td>
                      <td>
                        <div className="pa-visitor-name">{b.name}</div>
                        <div className="pa-visitor-phone">{b.phone}</div>
                      </td>
                      <td><span className="pa-puja-name">{puja?.icon} {b.pujaName}</span></td>
                      <td>
                        <div>{b.visitDate ? new Date(b.visitDate).toLocaleDateString('en-IN') : '—'}</div>
                        <div className="pa-time">{b.timeSlot}</div>
                      </td>
                      <td className="pa-center">{b.numberOfPeople}</td>
                      <td><span className="pa-amount">₹{b.pujaPrice?.toLocaleString('en-IN')}</span></td>
                      <td>
                        <span className={`pa-pay-badge ${b.paymentStatus === 'PAID' ? 'pa-pay-paid' : 'pa-pay-pending'}`}>
                          {b.paymentStatus === 'PAID' ? '✅ Paid' : '🏛️ At Temple'}
                        </span>
                      </td>
                      <td>
                        <span className="pa-status-badge" style={{ color: sc.color, background: sc.bg, borderColor: sc.color }}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <div className="pa-actions">
                          {b.status === 'PENDING' && (
                            <button className="pa-btn pa-btn-confirm" disabled={updating === b.id} onClick={() => updateStatus(b.id, 'CONFIRMED')}>Confirm</button>
                          )}
                          {b.status === 'CONFIRMED' && (
                            <button className="pa-btn pa-btn-complete" disabled={updating === b.id} onClick={() => updateStatus(b.id, 'COMPLETED')}>Complete</button>
                          )}
                          {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                            <button className="pa-btn pa-btn-cancel" disabled={updating === b.id} onClick={() => updateStatus(b.id, 'CANCELLED')}>Cancel</button>
                          )}
                          {b.status === 'COMPLETED' && <span className="pa-done">✓ Done</span>}
                          {b.status === 'CANCELLED' && <span className="pa-cancelled">✗ Cancelled</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
