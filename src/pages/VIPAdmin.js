import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/VIPAdmin.css';

const PLANS    = ['ALL', 'Silver Pass', 'Gold Pass', 'Platinum Pass'];
const STATUSES = ['ALL', 'PAID', 'PENDING', 'CANCELLED'];

const PLAN_COLORS = {
  'Silver Pass':   '#8b8bb5',
  'Gold Pass':     '#f4a261',
  'Platinum Pass': '#4cc9f0',
};

const ENTRY_COLORS = {
  PENDING:   { color: '#f4a261', bg: 'rgba(244,162,97,.12)'  },
  ENTERED:   { color: '#4cc9f0', bg: 'rgba(76,201,240,.12)'  },
  COMPLETED: { color: '#2dc653', bg: 'rgba(45,198,83,.12)'   },
  CANCELLED: { color: '#ff4d6d', bg: 'rgba(255,77,109,.12)'  },
};

export default function VIPAdmin() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [planFilter, setPlanFilter]     = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch]     = useState('');
  const [updating, setUpdating] = useState(null);
  const [refundModal, setRefundModal] = useState(null); // { id, bookingId, amount, name }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'vipBookings'), orderBy('createdAt', 'desc')));
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
    setLoading(false);
  };

  const updateEntry = async (id, entryStatus) => {
    setUpdating(id);
    const now = new Date();
    const updateData = { entryStatus };
    if (entryStatus === 'ENTERED')   updateData.enteredAt   = now;
    if (entryStatus === 'COMPLETED') updateData.completedAt = now;
    try {
      await updateDoc(doc(db, 'vipBookings', id), updateData);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updateData } : b));
    } catch {}
    setUpdating(null);
  };

  const cancelBooking = async () => {
    const { id, bookingId, amount, name } = refundModal;
    setRefundModal(null);
    setUpdating(id);
    try {
      await updateDoc(doc(db, 'vipBookings', id), {
        entryStatus: 'CANCELLED', status: 'CANCELLED', refundStatus: 'INITIATED'
      });
      await addDoc(collection(db, 'refunds'), {
        bookingId, type: 'VIP', visitorName: name,
        amount, refundStatus: 'INITIATED', createdAt: new Date(),
        initiatedBy: user.name || user.email || 'Admin'
      });
      await addDoc(collection(db, 'visitorMessages'), {
        bookingId, type: 'VIP', visitorName: name,
        message: `Your VIP Pass booking (${bookingId}) has been cancelled by the authorities. A refund of ₹${amount?.toLocaleString('en-IN')} has been initiated and will be processed shortly.`,
        read: false, createdAt: new Date()
      });
      setBookings(prev => prev.map(b =>
        b.id === id ? { ...b, entryStatus: 'CANCELLED', status: 'CANCELLED', refundStatus: 'INITIATED' } : b
      ));
    } catch {}
    setUpdating(null);
  };

  const filtered = bookings.filter(b => {
    const matchPlan   = planFilter === 'ALL' || b.plan === planFilter;
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchSearch = !search ||
      b.visitorName?.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingId?.toLowerCase().includes(search.toLowerCase()) ||
      b.visitorPhone?.includes(search) ||
      b.visitorEmail?.toLowerCase().includes(search.toLowerCase());
    return matchPlan && matchStatus && matchSearch;
  });

  const total     = bookings.length;
  const paid      = bookings.filter(b => b.status === 'PAID').length;
  const entered   = bookings.filter(b => b.entryStatus === 'ENTERED').length;
  const completed = bookings.filter(b => b.entryStatus === 'COMPLETED').length;
  const cancelled = bookings.filter(b => b.entryStatus === 'CANCELLED').length;
  const revenue   = bookings.filter(b => b.status === 'PAID').reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="va-root">
      <div className="va-inner">
        <div className="va-header">
          <div>
            <h1 className="va-title">💎 VIP Pass Bookings</h1>
            <p className="va-subtitle">Manage all VIP pass holders and their entry status</p>
          </div>
          <button className="va-refresh" onClick={fetchBookings}>↻ Refresh</button>
        </div>

        {/* Summary */}
        <div className="va-summary">
          <div className="va-summary-card va-s-total">
            <span className="va-s-count">{total}</span>
            <span className="va-s-label">Total Bookings</span>
          </div>
          <div className="va-summary-card va-s-paid">
            <span className="va-s-count">{paid}</span>
            <span className="va-s-label">Paid</span>
          </div>
          <div className="va-summary-card va-s-entered">
            <span className="va-s-count">{entered}</span>
            <span className="va-s-label">Entered</span>
          </div>
          <div className="va-summary-card va-s-completed">
            <span className="va-s-count">{completed}</span>
            <span className="va-s-label">Completed</span>
          </div>
          <div className="va-summary-card va-s-cancelled">
            <span className="va-s-count">{cancelled}</span>
            <span className="va-s-label">Cancelled</span>
          </div>
          <div className="va-summary-card va-s-revenue">
            <span className="va-s-count">₹{revenue.toLocaleString('en-IN')}</span>
            <span className="va-s-label">Total Revenue</span>
          </div>
        </div>

        {/* Controls */}
        <div className="va-controls">
          <div className="va-filters">
            {PLANS.map(p => (
              <button key={p} className={`va-filter-btn ${planFilter === p ? 'va-filter-active' : ''}`}
                style={planFilter === p && p !== 'ALL' ? { borderColor: PLAN_COLORS[p], color: PLAN_COLORS[p], background: `${PLAN_COLORS[p]}18` } : {}}
                onClick={() => setPlanFilter(p)}>{p}</button>
            ))}
          </div>
          <div className="va-filters">
            {STATUSES.map(s => (
              <button key={s} className={`va-filter-btn ${statusFilter === s ? 'va-filter-active' : ''}`}
                onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
          </div>
          <input className="va-search" placeholder="Search name, ID, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="va-loading"><div className="va-spinner" /><p>Loading bookings...</p></div>
        ) : filtered.length === 0 ? (
          <div className="va-empty">💎 No VIP bookings found</div>
        ) : (
          <div className="va-table-wrap">
            <table className="va-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Visitor</th>
                  <th>Contact</th>
                  <th>Plan</th>
                  <th>Visit Date</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Entry Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const ec = ENTRY_COLORS[b.entryStatus] || ENTRY_COLORS.PENDING;
                  const pc = PLAN_COLORS[b.plan] || '#8b8bb5';
                  return (
                    <tr key={b.id}>
                      <td><span className="va-booking-id">{b.bookingId}</span></td>
                      <td>
                        <div className="va-visitor-name">{b.visitorName}</div>
                        <div className="va-visitor-sub">{b.userName || '—'}</div>
                      </td>
                      <td>
                        <div className="va-visitor-name">{b.visitorPhone}</div>
                        <div className="va-visitor-sub">{b.visitorEmail}</div>
                      </td>
                      <td>
                        <span className="va-plan-badge" style={{ color: pc, background: `${pc}18`, borderColor: pc }}>
                          {b.plan === 'Platinum Pass' ? '💎' : b.plan === 'Gold Pass' ? '⭐' : '🥈'} {b.plan}
                        </span>
                      </td>
                      <td>{b.visitDate ? new Date(b.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td><span className="va-amount">₹{b.amount?.toLocaleString('en-IN')}</span></td>
                      <td>
                        <span className={`va-pay-badge ${b.status === 'PAID' ? 'va-pay-paid' : b.status === 'CANCELLED' ? 'va-pay-cancelled' : 'va-pay-pending'}`}>
                          {b.status === 'PAID' ? '✅ Paid' : b.status === 'CANCELLED' ? '✗ Cancelled' : '⏳ Pending'}
                        </span>
                      </td>
                      <td>
                        <span className="va-entry-badge" style={{ color: ec.color, background: ec.bg, borderColor: ec.color }}>
                          {b.entryStatus || 'PENDING'}
                        </span>
                      </td>
                      <td>
                        <div className="va-actions">
                          {b.entryStatus === 'PENDING' && b.status !== 'CANCELLED' && (
                            <button className="va-btn va-btn-enter" disabled={updating === b.id} onClick={() => updateEntry(b.id, 'ENTERED')}>Enter</button>
                          )}
                          {b.entryStatus === 'ENTERED' && (
                            <button className="va-btn va-btn-complete" disabled={updating === b.id} onClick={() => updateEntry(b.id, 'COMPLETED')}>Complete</button>
                          )}
                          {isAdmin && b.entryStatus !== 'CANCELLED' && b.entryStatus !== 'COMPLETED' && (
                            <button className="va-btn va-btn-cancel" disabled={updating === b.id}
                              onClick={() => setRefundModal({ id: b.id, bookingId: b.bookingId, amount: b.amount, name: b.visitorName })}>
                              Cancel
                            </button>
                          )}
                          {b.entryStatus === 'COMPLETED' && <span className="va-done">✓ Done</span>}
                          {b.entryStatus === 'CANCELLED' && (
                            <div className="va-cancelled-wrap">
                              <span className="va-cancelled">✗ Cancelled</span>
                              {b.refundStatus === 'INITIATED' && <span className="va-refund-badge">💰 Refund Initiated</span>}
                            </div>
                          )}
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

      {/* Refund Confirmation Modal */}
      {refundModal && (
        <div className="va-modal-overlay">
          <div className="va-modal">
            <div className="va-modal-icon">💰</div>
            <h2>Cancel & Refund</h2>
            <p>You are about to cancel the VIP booking for</p>
            <strong className="va-modal-name">{refundModal.name}</strong>
            <div className="va-modal-amount">Refund Amount: <span>₹{refundModal.amount?.toLocaleString('en-IN')}</span></div>
            <p className="va-modal-note">A refund record will be created and the booking will be cancelled. This action cannot be undone.</p>
            <div className="va-modal-actions">
              <button className="va-modal-btn-cancel" onClick={() => setRefundModal(null)}>Go Back</button>
              <button className="va-modal-btn-confirm" onClick={cancelBooking}>✔ Confirm & Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
