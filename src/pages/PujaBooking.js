import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import '../styles/PujaBooking.css';

export const PUJAS = [
  { id: 'archana',       name: 'Archana',        price: 101,  icon: '🌸', desc: 'Offering of flowers with chanting of 108 names' },
  { id: 'kumkumarchana', name: 'Kumkumarchana',   price: 151,  icon: '🔴', desc: 'Worship with kumkum (vermillion) to the deity' },
  { id: 'sahasranamam',  name: 'Sahasranamam',    price: 251,  icon: '📿', desc: 'Chanting of 1000 names of the deity' },
  { id: 'abhishekam',    name: 'Abhishekam',      price: 501,  icon: '🪔', desc: 'Sacred bath of the deity with milk, honey & water' },
  { id: 'homam',         name: 'Homam',           price: 1100, icon: '🔥', desc: 'Sacred fire ritual for blessings & prosperity' },
  { id: 'kalyanam',      name: 'Kalyanam',        price: 2100, icon: '💒', desc: 'Divine wedding ceremony of the deity' },
];

const TIME_SLOTS = ['6:00 AM', '8:00 AM', '10:00 AM', '12:00 PM', '4:00 PM', '6:00 PM'];

export default function PujaBooking() {
  const [step, setStep]       = useState(1);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', deityName: '',
    specialRequest: '', visitDate: '', timeSlot: '', numberOfPeople: '1',
    paymentMode: 'at_temple'
  });
  const [booking, setBooking]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [card, setCard]         = useState({ number: '', expiry: '', cvv: '', holder: '' });

  const puja = PUJAS.find(p => p.id === selected);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const formatCard   = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExpiry = v => { const d = v.replace(/\D/g,'').slice(0,4); return d.length >= 2 ? d.slice(0,2)+'/'+d.slice(2) : d; };

  const handleSubmit = () => {
    const { name, phone, visitDate, timeSlot } = formData;
    if (!name || !phone || !visitDate || !timeSlot) { setError('Please fill all required fields.'); return; }
    setError('');
    if (formData.paymentMode === 'online') { setStep(3); return; }
    saveBooking();
  };

  const saveBooking = async (paid = false) => {
    setLoading(true);
    try {
      const bookingId = 'PJA' + Math.floor(Math.random() * 90000 + 10000);
      await addDoc(collection(db, 'pujaBookings'), {
        ...formData, bookingId,
        pujaId: puja.id, pujaName: puja.name, pujaPrice: puja.price,
        status: 'PENDING', paymentStatus: paid ? 'PAID' : 'PENDING',
        createdAt: new Date()
      });
      setBooking({ ...formData, bookingId, puja });
      setStep(4);
    } catch { setError('Booking failed. Please try again.'); }
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!card.number || !card.expiry || !card.cvv || !card.holder) { setError('Please fill all card details.'); return; }
    if (card.number.replace(/\s/g,'').length < 16) { setError('Invalid card number.'); return; }
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setLoading(false);
    saveBooking(true);
  };

  // Step 1 — Select Puja
  if (step === 1) return (
    <div className="pb-root">
      <div className="pb-inner">
        <div className="pb-header">
          <span className="pb-eyebrow">Sacred Rituals</span>
          <h1 className="pb-title">Special Puja Booking</h1>
          <p className="pb-subtitle">Book a sacred puja performed by our temple priests</p>
        </div>

        <div className="pb-grid">
          {PUJAS.map(p => (
            <div
              key={p.id}
              className={`pb-card ${selected === p.id ? 'pb-card-selected' : ''}`}
              onClick={() => setSelected(p.id)}
            >
              <div className="pb-card-icon">{p.icon}</div>
              <div className="pb-card-info">
                <h3>{p.name}</h3>
                <p>{p.desc}</p>
              </div>
              <div className="pb-card-price">₹{p.price.toLocaleString('en-IN')}</div>
              {selected === p.id && <div className="pb-card-check">✓</div>}
            </div>
          ))}
        </div>

        <button className="pb-btn" disabled={!selected} onClick={() => setStep(2)}>
          Continue →
        </button>
      </div>
    </div>
  );

  // Step 2 — Details
  if (step === 2) return (
    <div className="pb-root">
      <div className="pb-inner pb-inner-sm">
        <button className="pb-back" onClick={() => setStep(1)}>← Back</button>
        <h1 className="pb-title">Booking Details</h1>
        <div className="pb-selected-badge">
          {puja.icon} {puja.name} — <strong>₹{puja.price.toLocaleString('en-IN')}</strong>
        </div>

        <div className="pb-form-card">
          <div className="pb-form-group">
            <label>Full Name *</label>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" />
          </div>
          <div className="pb-form-group">
            <label>Phone Number *</label>
            <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="10-digit mobile number" />
          </div>
          <div className="pb-form-group">
            <label>Email Address</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" />
          </div>
          <div className="pb-form-group">
            <label>Deity Name / Occasion</label>
            <input name="deityName" value={formData.deityName} onChange={handleChange} placeholder="e.g. Lord Shiva, Family Welfare" />
          </div>
          <div className="pb-row">
            <div className="pb-form-group">
              <label>Visit Date *</label>
              <input name="visitDate" type="date" value={formData.visitDate} onChange={handleChange}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="pb-form-group">
              <label>Number of People</label>
              <input name="numberOfPeople" type="number" min="1" max="20" value={formData.numberOfPeople} onChange={handleChange} />
            </div>
          </div>
          <div className="pb-form-group">
            <label>Time Slot *</label>
            <div className="pb-slots">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  type="button"
                  className={`pb-slot ${formData.timeSlot === slot ? 'pb-slot-active' : ''}`}
                  onClick={() => setFormData({ ...formData, timeSlot: slot })}
                >{slot}</button>
              ))}
            </div>
          </div>
          <div className="pb-form-group">
            <label>Special Request</label>
            <textarea name="specialRequest" value={formData.specialRequest} onChange={handleChange}
              placeholder="Any specific prayers or requests..." rows={3} />
          </div>

          <div className="pb-form-group">
            <label>Payment Mode *</label>
            <div className="pb-payment-options">
              <label className={`pb-pay-opt ${formData.paymentMode === 'at_temple' ? 'pb-pay-active' : ''}`}>
                <input type="radio" name="paymentMode" value="at_temple"
                  checked={formData.paymentMode === 'at_temple'} onChange={handleChange} />
                <span>🏛️</span>
                <div><strong>Pay at Temple</strong><small>Reserve now, pay on arrival</small></div>
              </label>
              <label className={`pb-pay-opt ${formData.paymentMode === 'online' ? 'pb-pay-active' : ''}`}>
                <input type="radio" name="paymentMode" value="online"
                  checked={formData.paymentMode === 'online'} onChange={handleChange} />
                <span>💳</span>
                <div><strong>Pay Online</strong><small>UPI / Card — Instant confirmation</small></div>
              </label>
            </div>
          </div>

          <div className="pb-summary">
            <span>Total Amount</span>
            <strong>₹{puja.price.toLocaleString('en-IN')}</strong>
          </div>

          {error && <div className="pb-error">{error}</div>}

          <button className="pb-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Booking...' : formData.paymentMode === 'online' ? 'Proceed to Payment →' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );

  // Step 3 — Payment
  if (step === 3) return (
    <div className="pb-root">
      <div className="pb-inner pb-inner-sm">
        <button className="pb-back" onClick={() => setStep(2)}>← Back</button>
        <h1 className="pb-title">Secure Payment</h1>

        <div className="pb-form-card">
          <div className="pb-payment-summary">
            <span>{puja.icon} {puja.name}</span>
            <strong>₹{puja.price.toLocaleString('en-IN')}</strong>
          </div>

          <div className="pb-card-preview">
            <div className="pb-card-chip">▬▬</div>
            <div className="pb-card-number">{card.number || '•••• •••• •••• ••••'}</div>
            <div className="pb-card-bottom">
              <span>{card.holder || 'CARD HOLDER'}</span>
              <span>{card.expiry || 'MM/YY'}</span>
            </div>
          </div>

          <div className="pb-form-group">
            <label>Card Number</label>
            <input type="text" value={card.number} onChange={e => setCard({...card, number: formatCard(e.target.value)})} placeholder="1234 5678 9012 3456" maxLength={19} />
          </div>
          <div className="pb-form-group">
            <label>Card Holder Name</label>
            <input type="text" value={card.holder} onChange={e => setCard({...card, holder: e.target.value.toUpperCase()})} placeholder="NAME ON CARD" />
          </div>
          <div className="pb-row">
            <div className="pb-form-group">
              <label>Expiry</label>
              <input type="text" value={card.expiry} onChange={e => setCard({...card, expiry: formatExpiry(e.target.value)})} placeholder="MM/YY" maxLength={5} />
            </div>
            <div className="pb-form-group">
              <label>CVV</label>
              <input type="password" value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value.slice(0,3)})} placeholder="•••" maxLength={3} />
            </div>
          </div>

          {error && <div className="pb-error">{error}</div>}

          <button className="pb-btn pb-btn-pay" onClick={handlePayment} disabled={loading}>
            {loading ? <span className="pb-processing"><span className="pb-spinner" /> Processing...</span> : `Pay ₹${puja.price.toLocaleString('en-IN')}`}
          </button>
          <p className="pb-secure-note">🔒 Secured & Encrypted Payment</p>
        </div>
      </div>
    </div>
  );

  // Step 4 — Success
  if (step === 4 && booking) {
    const qrValue = JSON.stringify({ bookingId: booking.bookingId, type: 'PUJA', pujaName: booking.puja.name, name: booking.name });
    return (
      <div className="pb-root">
        <div className="pb-inner pb-inner-sm">
          <div className="pb-success-card">
            <div className="pb-success-icon">🙏</div>
            <h2>Puja Booked Successfully!</h2>
            <p className="pb-booking-id">Booking ID: <strong>{booking.bookingId}</strong></p>

            <div className="pb-success-details">
              <div className="pb-detail-row"><span>Puja</span><strong>{booking.puja.icon} {booking.puja.name}</strong></div>
              <div className="pb-detail-row"><span>Name</span><strong>{booking.name}</strong></div>
              <div className="pb-detail-row"><span>Date</span><strong>{new Date(booking.visitDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
              <div className="pb-detail-row"><span>Time</span><strong>{booking.timeSlot}</strong></div>
              <div className="pb-detail-row"><span>Amount</span><strong style={{ color: '#2dc653' }}>₹{booking.puja.price.toLocaleString('en-IN')}</strong></div>
              <div className="pb-detail-row"><span>Payment</span><strong>{booking.paymentMode === 'online' ? '✅ Paid Online' : '🏛️ Pay at Temple'}</strong></div>
            </div>

            <div className="pb-qr-wrapper">
              <QRCodeCanvas value={qrValue} size={170} bgColor="#0f0f2a" fgColor="#a78bfa" level="H" includeMargin />
            </div>
            <p className="pb-qr-hint">Show this QR to the priest at the temple</p>

            <button className="pb-btn" onClick={() => { setStep(1); setSelected(null); setBooking(null); setFormData({ name:'',phone:'',email:'',deityName:'',specialRequest:'',visitDate:'',timeSlot:'',numberOfPeople:'1',paymentMode:'at_temple' }); }}>
              Book Another Puja
            </button>
          </div>
        </div>
      </div>
    );
  }
}
