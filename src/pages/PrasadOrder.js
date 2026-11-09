import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import '../styles/PrasadOrder.css';

const PRASAD_ITEMS = [
  { id: 'ladoo',    name: 'Ladoo',         price: 50,  icon: '🍬', desc: 'Sweet round delicacy offered to the deity' },
  { id: 'coconut',  name: 'Coconut Prasad',price: 30,  icon: '🥥', desc: 'Sacred coconut blessed by the priest' },
  { id: 'panchamrit',name:'Panchamrit',    price: 40,  icon: '🍯', desc: 'Five sacred ingredients — milk, curd, honey, ghee & sugar' },
  { id: 'flower',   name: 'Flower Prasad', price: 25,  icon: '🌺', desc: 'Fresh flowers blessed at the sanctum' },
  { id: 'fruit',    name: 'Fruit Prasad',  price: 60,  icon: '🍊', desc: 'Assorted seasonal fruits offered to the deity' },
];

const TIME_SLOTS = ['6:00 AM', '8:00 AM', '10:00 AM', '12:00 PM', '4:00 PM', '6:00 PM'];

export default function PrasadOrder() {
  const [selected, setSelected]   = useState([]);
  const [formData, setFormData]   = useState({ name: '', phone: '', pickupDate: '', timeSlot: '', paymentMode: 'at_temple' });
  const [step, setStep]           = useState(1);
  const [booking, setBooking]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const toggleItem = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectedItems = PRASAD_ITEMS.filter(p => selected.includes(p.id));
  const total = selectedItems.reduce((s, p) => s + p.price, 0);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.pickupDate || !formData.timeSlot) {
      setError('Please fill all required fields.'); return;
    }
    setError(''); setLoading(true);
    try {
      const orderId = 'PRS' + Math.floor(Math.random() * 90000 + 10000);
      await addDoc(collection(db, 'prasadOrders'), {
        ...formData, orderId,
        items: selectedItems.map(p => ({ id: p.id, name: p.name, price: p.price })),
        totalAmount: total,
        status: 'PENDING',
        paymentStatus: formData.paymentMode === 'online' ? 'PAID' : 'PENDING',
        createdAt: new Date()
      });
      setBooking({ ...formData, orderId, items: selectedItems, total });
      setStep(3);
    } catch (e) { setError('Order failed. Please try again.'); }
    setLoading(false);
  };

  const reset = () => {
    setSelected([]); setStep(1); setBooking(null); setError('');
    setFormData({ name: '', phone: '', pickupDate: '', timeSlot: '', paymentMode: 'at_temple' });
  };

  // Step 1 — Select Prasad
  if (step === 1) return (
    <div className="po-root">
      <div className="po-inner">
        <div className="po-header">
          <span className="po-eyebrow">Divine Offerings</span>
          <h1 className="po-title">Order Prasad</h1>
          <p className="po-subtitle">Select the prasad you wish to receive — blessed by our temple priests</p>
        </div>

        <div className="po-grid">
          {PRASAD_ITEMS.map(p => (
            <div key={p.id} className={`po-card ${selected.includes(p.id) ? 'po-card-selected' : ''}`}
              onClick={() => toggleItem(p.id)}>
              <div className="po-card-icon">{p.icon}</div>
              <div className="po-card-info">
                <h3>{p.name}</h3>
                <p>{p.desc}</p>
              </div>
              <div className="po-card-price">₹{p.price}</div>
              {selected.includes(p.id) && <div className="po-card-check">✓</div>}
            </div>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="po-selection-summary">
            <div className="po-selected-items">
              {selectedItems.map(p => (
                <span key={p.id} className="po-selected-tag">{p.icon} {p.name}</span>
              ))}
            </div>
            <div className="po-total-row">
              <span>Total</span>
              <strong>₹{total}</strong>
            </div>
          </div>
        )}

        <button className="po-btn" disabled={selected.length === 0} onClick={() => setStep(2)}>
          Continue →
        </button>
      </div>
    </div>
  );

  // Step 2 — Details
  if (step === 2) return (
    <div className="po-root">
      <div className="po-inner po-inner-sm">
        <button className="po-back" onClick={() => setStep(1)}>← Back</button>
        <h1 className="po-title">Pickup Details</h1>

        <div className="po-order-badge">
          {selectedItems.map(p => p.icon).join(' ')} {selectedItems.map(p => p.name).join(', ')} — <strong>₹{total}</strong>
        </div>

        <div className="po-form-card">
          <div className="po-form-group">
            <label>Full Name *</label>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" />
          </div>
          <div className="po-form-group">
            <label>Phone Number *</label>
            <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="10-digit mobile number" />
          </div>
          <div className="po-form-group">
            <label>Pickup Date *</label>
            <input name="pickupDate" type="date" value={formData.pickupDate} onChange={handleChange}
              min={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="po-form-group">
            <label>Pickup Time Slot *</label>
            <div className="po-slots">
              {TIME_SLOTS.map(slot => (
                <button key={slot} type="button"
                  className={`po-slot ${formData.timeSlot === slot ? 'po-slot-active' : ''}`}
                  onClick={() => setFormData({ ...formData, timeSlot: slot })}>{slot}</button>
              ))}
            </div>
          </div>

          <div className="po-form-group">
            <label>Payment Mode *</label>
            <div className="po-payment-options">
              <label className={`po-pay-opt ${formData.paymentMode === 'at_temple' ? 'po-pay-active' : ''}`}>
                <input type="radio" name="paymentMode" value="at_temple"
                  checked={formData.paymentMode === 'at_temple'} onChange={handleChange} />
                <span>🏛️</span>
                <div><strong>Pay at Temple</strong><small>Pay when collecting prasad</small></div>
              </label>
              <label className={`po-pay-opt ${formData.paymentMode === 'online' ? 'po-pay-active' : ''}`}>
                <input type="radio" name="paymentMode" value="online"
                  checked={formData.paymentMode === 'online'} onChange={handleChange} />
                <span>💳</span>
                <div><strong>Pay Online</strong><small>UPI / Card — Instant confirmation</small></div>
              </label>
            </div>
          </div>

          <div className="po-summary-row">
            <span>Total Amount</span>
            <strong>₹{total}</strong>
          </div>

          {error && <div className="po-error">{error}</div>}

          <button className="po-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Placing Order...' : formData.paymentMode === 'online' ? `Pay ₹${total}` : 'Confirm Order'}
          </button>
        </div>
      </div>
    </div>
  );

  // Step 3 — Success
  if (step === 3 && booking) {
    const qrVal = JSON.stringify({ orderId: booking.orderId, type: 'PRASAD', name: booking.name, items: booking.items.map(i => i.name) });
    return (
      <div className="po-root">
        <div className="po-inner po-inner-sm">
          <div className="po-success-card">
            <div className="po-success-icon">🙏</div>
            <h2>Prasad Order Confirmed!</h2>
            <p className="po-order-id">Order ID: <strong>{booking.orderId}</strong></p>

            <div className="po-success-items">
              {booking.items.map(p => (
                <span key={p.id} className="po-success-tag">{PRASAD_ITEMS.find(x => x.id === p.id)?.icon} {p.name}</span>
              ))}
            </div>

            <div className="po-success-details">
              <div className="po-detail-row"><span>Name</span><strong>{booking.name}</strong></div>
              <div className="po-detail-row"><span>Pickup Date</span><strong>{new Date(booking.pickupDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</strong></div>
              <div className="po-detail-row"><span>Time Slot</span><strong>{booking.timeSlot}</strong></div>
              <div className="po-detail-row"><span>Total</span><strong style={{color:'#2dc653'}}>₹{booking.total}</strong></div>
              <div className="po-detail-row"><span>Payment</span><strong>{booking.paymentMode === 'online' ? '✅ Paid Online' : '🏛️ Pay at Temple'}</strong></div>
            </div>

            <div className="po-qr-wrapper">
              <QRCodeCanvas value={qrVal} size={160} bgColor="#0f0f2a" fgColor="#f4a261" level="H" includeMargin />
            </div>
            <p className="po-qr-hint">Show this QR at the Prasad counter for collection</p>

            <button className="po-btn" onClick={reset}>Order More Prasad</button>
          </div>
        </div>
      </div>
    );
  }
}
