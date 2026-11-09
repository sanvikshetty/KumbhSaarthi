import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/PrasadAdmin.css';

const STATUSES = ['ALL', 'PENDING', 'READY', 'COLLECTED', 'CANCELLED'];

const STATUS_COLORS = {
  PENDING:   { color: '#f4a261', bg: 'rgba(244,162,97,.12)' },
  READY:     { color: '#4cc9f0', bg: 'rgba(76,201,240,.12)' },
  COLLECTED: { color: '#2dc653', bg: 'rgba(45,198,83,.12)'  },
  CANCELLED: { color: '#ff4d6d', bg: 'rgba(255,77,109,.12)' },
};

export default function PrasadAdmin() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('ALL');
  const [search,   setSearch]   = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'prasadOrders'), orderBy('createdAt', 'desc')));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {}
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    const now = new Date();
    const updateData = { status };
    if (status === 'READY')     updateData.readyAt     = now;
    if (status === 'COLLECTED') updateData.collectedAt = now;
    if (status === 'CANCELLED') updateData.cancelledAt = now;
    try {
      await updateDoc(doc(db, 'prasadOrders', id), updateData);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updateData } : o));
    } catch (e) {}
    setUpdating(null);
  };

  const filtered = orders.filter(o => {
    const matchFilter = filter === 'ALL' || o.status === filter;
    const matchSearch = !search ||
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.orderId?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.includes(search);
    return matchFilter && matchSearch;
  });

  const counts = STATUSES.slice(1).reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  const revenue = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <div className="pra-root">
      <div className="pra-inner">
        <div className="pra-header">
          <div>
            <h1 className="pra-title">🙏 Prasad Orders</h1>
            <p className="pra-subtitle">Manage all prasad orders and pickups</p>
          </div>
          <button className="pra-refresh" onClick={fetchOrders}>↻ Refresh</button>
        </div>

        {/* Summary */}
        <div className="pra-summary">
          {STATUSES.slice(1).map(s => (
            <div key={s} className="pra-summary-card" style={{ borderColor: STATUS_COLORS[s].color, background: STATUS_COLORS[s].bg }}>
              <span className="pra-s-count" style={{ color: STATUS_COLORS[s].color }}>{counts[s] || 0}</span>
              <span className="pra-s-label">{s}</span>
            </div>
          ))}
          <div className="pra-summary-card pra-revenue">
            <span className="pra-s-count">₹{revenue.toLocaleString('en-IN')}</span>
            <span className="pra-s-label">Revenue</span>
          </div>
        </div>

        {/* Controls */}
        <div className="pra-controls">
          <div className="pra-filters">
            {STATUSES.map(s => (
              <button key={s} className={`pra-filter-btn ${filter === s ? 'pra-filter-active' : ''}`}
                onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
          <input className="pra-search" placeholder="Search by name, ID or phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="pra-loading"><div className="pra-spinner" /><p>Loading orders...</p></div>
        ) : filtered.length === 0 ? (
          <div className="pra-empty">🙏 No prasad orders found</div>
        ) : (
          <div className="pra-table-wrap">
            <table className="pra-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Visitor</th>
                  <th>Items</th>
                  <th>Pickup Date</th>
                  <th>Time Slot</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const sc = STATUS_COLORS[o.status] || STATUS_COLORS.PENDING;
                  return (
                    <tr key={o.id}>
                      <td><span className="pra-order-id">{o.orderId}</span></td>
                      <td>
                        <div className="pra-name">{o.name}</div>
                        <div className="pra-phone">{o.phone}</div>
                      </td>
                      <td>
                        <div className="pra-items">
                          {o.items?.map(i => (
                            <span key={i.id} className="pra-item-tag">{i.name}</span>
                          ))}
                        </div>
                      </td>
                      <td>{o.pickupDate ? new Date(o.pickupDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td><span className="pra-slot">{o.timeSlot}</span></td>
                      <td><span className="pra-amount">₹{o.totalAmount}</span></td>
                      <td>
                        <span className={`pra-pay-badge ${o.paymentStatus === 'PAID' ? 'pra-pay-paid' : 'pra-pay-pending'}`}>
                          {o.paymentStatus === 'PAID' ? '✅ Paid' : '🏛️ At Temple'}
                        </span>
                      </td>
                      <td>
                        <span className="pra-status-badge" style={{ color: sc.color, background: sc.bg, borderColor: sc.color }}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <div className="pra-actions">
                          {o.status === 'PENDING' && (
                            <button className="pra-btn pra-btn-ready" disabled={updating === o.id}
                              onClick={() => updateStatus(o.id, 'READY')}>Mark Ready</button>
                          )}
                          {o.status === 'READY' && (
                            <button className="pra-btn pra-btn-collected" disabled={updating === o.id}
                              onClick={() => updateStatus(o.id, 'COLLECTED')}>Collected</button>
                          )}
                          {(o.status === 'PENDING' || o.status === 'READY') && (
                            <button className="pra-btn pra-btn-cancel" disabled={updating === o.id}
                              onClick={() => updateStatus(o.id, 'CANCELLED')}>Cancel</button>
                          )}
                          {o.status === 'COLLECTED' && <span className="pra-done">✓ Done</span>}
                          {o.status === 'CANCELLED' && <span className="pra-cancelled">✗ Cancelled</span>}
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
