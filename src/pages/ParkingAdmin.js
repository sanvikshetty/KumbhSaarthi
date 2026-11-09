import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/Parking.css';

const ZONES = {
  A: { label: 'Zone A - Two Wheeler', total: 20, prefix: 'A' },
  B: { label: 'Zone B - Four Wheeler', total: 15, prefix: 'B' },
  C: { label: 'Zone C - Bus / Large Vehicle', total: 5, prefix: 'C' },
};

function ParkingAdmin() {
  const [parkings, setParkings] = useState([]);
  const [filter, setFilter]     = useState('ALL');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'parking'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setParkings(data);
    });
    return () => unsub();
  }, []);

  const releaseSlot = async (id) => {
    await updateDoc(doc(db, 'parking', id), { status: 'RELEASED' });
  };

  const occupiedSlots = parkings.filter(p => p.status === 'ACTIVE').map(p => p.slotId);

  const getSlotBooking = (slotId) => parkings.find(p => p.slotId === slotId && p.status === 'ACTIVE');

  const filtered = filter === 'ALL' ? parkings : parkings.filter(p => p.status === filter);

  return (
    <div className="parking-root">
      <div className="parking-inner">
        <h1 className="parking-title">Parking Management</h1>
        <p className="parking-subtitle">Live parking slot status and management</p>

        {/* Summary */}
        <div className="parking-summary">
          {Object.entries(ZONES).map(([key, z]) => {
            const occ = occupiedSlots.filter(s => s.startsWith(z.prefix)).length;
            return (
              <div className="parking-summary-card" key={key}>
                <div className="parking-summary-zone">{z.prefix}</div>
                <div>
                  <p>{z.label}</p>
                  <strong>{z.total - occ} free / {z.total} total</strong>
                </div>
                <div className="parking-summary-bar">
                  <div style={{ width: `${(occ / z.total) * 100}%`, background: occ / z.total > 0.8 ? '#ff4d6d' : '#7c3aed' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Zone Grid Map */}
        {Object.entries(ZONES).map(([key, z]) => (
          <div className="parking-zone-section" key={key}>
            <h3>{z.label}</h3>
            <div className="parking-grid">
              {Array.from({ length: z.total }, (_, i) => {
                const slotId = `${z.prefix}${i + 1}`;
                const booking = getSlotBooking(slotId);
                return (
                  <div
                    key={slotId}
                    className={`parking-slot ${booking ? 'slot-occupied' : 'slot-free'}`}
                    title={booking ? `${booking.visitorName} - ${booking.vehicleNumber}` : 'Available'}
                  >
                    <span className="slot-id">{slotId}</span>
                    {booking && <span className="slot-vehicle">{booking.vehicleNumber.toUpperCase()}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Bookings Table */}
        <div className="parking-table-section">
          <div className="parking-table-header">
            <h3>Parking Bookings</h3>
            <div className="filter-buttons">
              <button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>All ({parkings.length})</button>
              <button className={filter === 'ACTIVE' ? 'active' : ''} onClick={() => setFilter('ACTIVE')}>Active ({parkings.filter(p => p.status === 'ACTIVE').length})</button>
              <button className={filter === 'RELEASED' ? 'active' : ''} onClick={() => setFilter('RELEASED')}>Released</button>
            </div>
          </div>

          <div className="table-container">
            {filtered.length === 0 ? (
              <p style={{textAlign:'center',padding:'2rem',color:'#8b8bb5'}}>No parking bookings.</p>
            ) : (
              <table className="visitors-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Slot</th>
                    <th>Visitor</th>
                    <th>Vehicle No.</th>
                    <th>Type</th>
                    <th>Booking ID</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td><strong style={{color:'#a78bfa'}}>{p.slotId}</strong></td>
                      <td>{p.visitorName}</td>
                      <td>{p.vehicleNumber?.toUpperCase()}</td>
                      <td>{p.vehicleType}</td>
                      <td>{p.bookingId}</td>
                      <td>
                        <span className={`status-badge ${p.status === 'ACTIVE' ? 'status-checked-in' : 'status-checked-out'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status === 'ACTIVE' && (
                          <button className="action-btn btn-checkout" onClick={() => releaseSlot(p.id)}>Release</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParkingAdmin;
