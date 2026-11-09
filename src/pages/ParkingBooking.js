import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/Parking.css';

const ZONES = {
  A: { label: 'Zone A - Two Wheeler', total: 20, prefix: 'A' },
  B: { label: 'Zone B - Four Wheeler', total: 15, prefix: 'B' },
  C: { label: 'Zone C - Bus / Large Vehicle', total: 5, prefix: 'C' },
};

function ParkingBooking() {
  const [formData, setFormData] = useState({
    bookingId: '', vehicleNumber: '', vehicleType: '2-wheeler', visitDate: ''
  });
  const [occupied, setOccupied] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'parking'), (snap) => {
      setOccupied(snap.docs.map(d => d.data().slotId));
    });
    return () => unsub();
  }, []);

  const getZoneForVehicle = (type) => {
    if (type === '2-wheeler') return 'A';
    if (type === '4-wheeler') return 'B';
    return 'C';
  };

  const assignSlot = (zone) => {
    const z = ZONES[zone];
    for (let i = 1; i <= z.total; i++) {
      const slotId = `${z.prefix}${i}`;
      if (!occupied.includes(slotId)) return slotId;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const zone = getZoneForVehicle(formData.vehicleType);
      const slot = assignSlot(zone);
      if (!slot) {
        setError(`No slots available in ${ZONES[zone].label}. Try a different vehicle type.`);
        setLoading(false);
        return;
      }
      await addDoc(collection(db, 'parking'), {
        ...formData,
        slotId: slot,
        zone,
        visitorName: user.name,
        visitorEmail: user.email,
        status: 'ACTIVE',
        createdAt: new Date()
      });
      setSuccess({ ...formData, slotId: slot, zone });
    } catch {
      setError('Parking booking failed. Please try again.');
    }
    setLoading(false);
  };

  const getAvailable = (zone) => {
    const z = ZONES[zone];
    const occ = occupied.filter(s => s.startsWith(z.prefix)).length;
    return z.total - occ;
  };

  if (success) {
    return (
      <div className="parking-root">
        <div className="parking-inner">
          <h1 className="parking-title">Parking Booking</h1>
          <div className="parking-success-card">
            <div className="parking-success-icon">✅</div>
            <h2>Parking Slot Assigned!</h2>
            <div className="parking-slot-big">{success.slotId}</div>
            <p className="parking-zone-label">{ZONES[success.zone].label}</p>
            <div className="parking-details">
              <div className="parking-detail-row"><span>Booking ID</span><strong>{success.bookingId}</strong></div>
              <div className="parking-detail-row"><span>Vehicle No.</span><strong>{success.vehicleNumber.toUpperCase()}</strong></div>
              <div className="parking-detail-row"><span>Vehicle Type</span><strong>{success.vehicleType}</strong></div>
              <div className="parking-detail-row"><span>Visit Date</span><strong>{new Date(success.visitDate).toLocaleString()}</strong></div>
            </div>
            <p className="parking-hint">Please remember your slot number <strong>{success.slotId}</strong></p>
            <button className="parking-btn-primary" onClick={() => setSuccess(null)}>Book Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parking-root">
      <div className="parking-inner">
        <h1 className="parking-title">Parking Booking</h1>
        <p className="parking-subtitle">Book a parking slot for your temple visit</p>

        {/* Live availability */}
        <div className="parking-availability">
          {Object.entries(ZONES).map(([key, z]) => (
            <div className="parking-avail-card" key={key}>
              <div className="parking-avail-zone">{z.prefix}</div>
              <div className="parking-avail-info">
                <span>{z.label}</span>
                <strong style={{ color: getAvailable(key) > 0 ? '#2dc653' : '#ff4d6d' }}>
                  {getAvailable(key)} / {z.total} available
                </strong>
              </div>
            </div>
          ))}
        </div>

        <div className="parking-form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Temple Booking ID *</label>
              <input type="text" value={formData.bookingId} onChange={e => setFormData({...formData, bookingId: e.target.value})} placeholder="e.g. TMP12345" required />
            </div>
            <div className="form-group">
              <label>Vehicle Number *</label>
              <input type="text" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="e.g. MH12AB1234" required />
            </div>
            <div className="form-group">
              <label>Vehicle Type *</label>
              <select value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})}>
                <option value="2-wheeler">2-Wheeler (Zone A)</option>
                <option value="4-wheeler">4-Wheeler (Zone B)</option>
                <option value="bus">Bus / Large Vehicle (Zone C)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Visit Date & Time *</label>
              <input type="datetime-local" value={formData.visitDate} onChange={e => setFormData({...formData, visitDate: e.target.value})} required />
            </div>
            {error && <div className="parking-error">{error}</div>}
            <button type="submit" className="parking-btn-primary" disabled={loading}>
              {loading ? 'Booking...' : 'Book Parking Slot'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ParkingBooking;
