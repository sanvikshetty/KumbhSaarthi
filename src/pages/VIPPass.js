import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import '../styles/VIPPass.css';

const VIP_PLANS = [
  {
    id: 'silver', name: 'Silver Pass', price: 199, color: '#8b8bb5',
    tag: 'Basic',
    benefits: [
      'Priority Entry',
      'Skip General Queue',
      'Dedicated Entry Lane',
      'Digital Receipt',
      'Valid 1 Day'
    ]
  },
  {
    id: 'gold', name: 'Gold Pass', price: 499, color: '#f4a261',
    tag: 'Popular',
    benefits: [
      'Priority Entry',
      'Skip General Queue',
      'Reserved Parking Slot',
      'Locker Facility',
      'Prasad Included',
      '🌸 Archana (₹101) Included',
      '🔴 Kumkumarchana (₹151) Included',
      '📿 Sahasranamam (₹251) Included',
      'Valid 1 Day'
    ]
  },
  {
    id: 'platinum', name: 'Platinum Pass', price: 999, color: '#4cc9f0',
    tag: 'Premium',
    benefits: [
      'VIP Darshan — Front Row Access',
      'Dedicated VIP Entry Gate',
      'Dedicated Covered Parking',
      'Personal Temple Guide',
      'Locker + Prasad + Flowers',
      'Complimentary Refreshments',
      '🌸 Archana (₹101) Included',
      '🔴 Kumkumarchana (₹151) Included',
      '📿 Sahasranamam (₹251) Included',
      '🪔 Abhishekam (₹501) Included',
      'Meet the Head Priest',
      'Exclusive Souvenir Gift',
      'Concierge Assistance',
      'Wheelchair / Senior Assistance',
      'Valid Full Day — All Sessions'
    ]
  },
];

function VIPPass() {
  const [step, setStep]         = useState(1); // 1=select, 2=details, 3=payment, 4=success
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', visitDate: '' });
  const [card, setCard]         = useState({ number: '', expiry: '', cvv: '', holder: '' });
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking]   = useState(null);
  const [error, setError]       = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handlePayment = async () => {
    if (!card.number || !card.expiry || !card.cvv || !card.holder) {
      setError('Please fill all card details.');
      return;
    }
    if (card.number.replace(/\s/g,'').length < 16) {
      setError('Invalid card number.');
      return;
    }
    setError('');
    setProcessing(true);

    // simulate payment processing
    await new Promise(r => setTimeout(r, 2500));

    try {
      const bookingId = 'VIP' + Math.floor(Math.random() * 90000 + 10000);
      const plan = VIP_PLANS.find(p => p.id === selected);
      await addDoc(collection(db, 'vipBookings'), {
        bookingId,
        visitorName: formData.name,
        visitorEmail: formData.email,
        visitorPhone: formData.phone,
        visitDate: formData.visitDate,
        plan: plan.name,
        planId: plan.id,
        amount: plan.price,
        status: 'PAID',
        entryStatus: 'PENDING',
        createdAt: new Date(),
        userEmail: user.email || '',
        userName: user.name || '',
      });
      setBooking({ bookingId, plan, ...formData });
      setStep(4);
    } catch {
      setError('Payment failed. Please try again.');
    }
    setProcessing(false);
  };

  const formatCard = (val) => {
    const v = val.replace(/\D/g, '').slice(0, 16);
    return v.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const v = val.replace(/\D/g, '').slice(0, 4);
    return v.length >= 2 ? v.slice(0,2) + '/' + v.slice(2) : v;
  };

  // Step 1 — Select Plan
  if (step === 1) return (
    <div className="vip-root">
      <div className="vip-inner">
        <div className="vip-header">
          <span className="vip-eyebrow">Exclusive Access</span>
          <h1 className="vip-title">VIP Pass</h1>
          <p className="vip-subtitle">Skip the queue and enjoy a premium temple experience</p>
          <div className="vip-note">
            <div className="vip-note-item">
              <span className="vip-note-icon">👶</span>
              <div>
                <strong>Free Entry for Kids</strong>
                <p>Children below 5 years of age do not require a VIP pass — complimentary entry.</p>
              </div>
            </div>
            <div className="vip-note-divider" />
            <div className="vip-note-item">
              <span className="vip-note-icon">🎫</span>
              <div>
                <strong>Single Entry Only</strong>
                <p>Each pass permits one entry per visit and is strictly non-transferable.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="vip-plans">
          {VIP_PLANS.map(plan => (
            <div
              key={plan.id}
              className={`vip-plan-card ${selected === plan.id ? 'vip-plan-selected' : ''} ${plan.id === 'platinum' ? 'vip-plan-platinum' : ''}`}
              style={{ '--plan-color': plan.color }}
              onClick={() => setSelected(plan.id)}
            >
              {plan.tag && <div className="vip-plan-tag" style={{background: plan.color}}>{plan.tag}</div>}
              <div className="vip-plan-top">
                <h3>{plan.id === 'platinum' ? '💎 ' : plan.id === 'gold' ? '⭐ ' : ''}{plan.name}</h3>
                <div className="vip-plan-price">
                  <span className="vip-currency">₹</span>
                  <span className="vip-amount">{plan.price}</span>
                </div>
              </div>
              <ul className="vip-plan-benefits">
                {plan.benefits.map((b, i) => <li key={i}>✓ {b}</li>)}
              </ul>
              {selected === plan.id && <div className="vip-plan-check">✓ Selected</div>}
            </div>
          ))}
        </div>

        <button className="vip-btn" disabled={!selected} onClick={() => setStep(2)}>
          Continue →
        </button>
      </div>
    </div>
  );

  // Step 2 — Visitor Details
  if (step === 2) return (
    <div className="vip-root">
      <div className="vip-inner vip-inner-sm">
        <button className="vip-back" onClick={() => setStep(1)}>← Back</button>
        <h1 className="vip-title">Visitor Details</h1>
        <p className="vip-subtitle">Selected: <strong style={{color: VIP_PLANS.find(p=>p.id===selected)?.color}}>{VIP_PLANS.find(p=>p.id===selected)?.name} — ₹{VIP_PLANS.find(p=>p.id===selected)?.price}</strong></p>

        <div className="vip-form-card">
          {[
            { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Enter your name' },
            { label: 'Phone Number *', key: 'phone', type: 'tel', placeholder: '10-digit mobile number' },
            { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'your@email.com' },
            { label: 'Visit Date *', key: 'visitDate', type: 'date', placeholder: '' },
          ].map(f => (
            <div className="vip-form-group" key={f.key}>
              <label>{f.label}</label>
              <input
                type={f.type}
                value={formData[f.key]}
                onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                placeholder={f.placeholder}
                min={f.type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
              />
            </div>
          ))}
          <button
            className="vip-btn"
            onClick={() => {
              if (!formData.name || !formData.phone || !formData.email || !formData.visitDate) {
                setError('Please fill all fields.'); return;
              }
              setError(''); setStep(3);
            }}
          >
            Proceed to Payment →
          </button>
          {error && <div className="vip-error">{error}</div>}
        </div>
      </div>
    </div>
  );

  // Step 3 — Mock Payment
  if (step === 3) {
    const plan = VIP_PLANS.find(p => p.id === selected);
    return (
      <div className="vip-root">
        <div className="vip-inner vip-inner-sm">
          <button className="vip-back" onClick={() => setStep(2)}>← Back</button>
          <h1 className="vip-title">Secure Payment</h1>

          <div className="vip-payment-card">
            <div className="vip-payment-summary">
              <span>{plan.name}</span>
              <strong>₹{plan.price}</strong>
            </div>

            <div className="vip-card-preview">
              <div className="vip-card-chip">▬▬</div>
              <div className="vip-card-number">{card.number || '•••• •••• •••• ••••'}</div>
              <div className="vip-card-bottom">
                <span>{card.holder || 'CARD HOLDER'}</span>
                <span>{card.expiry || 'MM/YY'}</span>
              </div>
            </div>

            <div className="vip-form-group">
              <label>Card Number</label>
              <input
                type="text"
                value={card.number}
                onChange={e => setCard({...card, number: formatCard(e.target.value)})}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            <div className="vip-form-group">
              <label>Card Holder Name</label>
              <input
                type="text"
                value={card.holder}
                onChange={e => setCard({...card, holder: e.target.value.toUpperCase()})}
                placeholder="NAME ON CARD"
              />
            </div>
            <div className="vip-card-row">
              <div className="vip-form-group">
                <label>Expiry</label>
                <input
                  type="text"
                  value={card.expiry}
                  onChange={e => setCard({...card, expiry: formatExpiry(e.target.value)})}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div className="vip-form-group">
                <label>CVV</label>
                <input
                  type="password"
                  value={card.cvv}
                  onChange={e => setCard({...card, cvv: e.target.value.slice(0,3)})}
                  placeholder="•••"
                  maxLength={3}
                />
              </div>
            </div>

            {error && <div className="vip-error">{error}</div>}

            <button className="vip-btn vip-btn-pay" onClick={handlePayment} disabled={processing}>
              {processing ? (
                <span className="vip-processing">
                  <span className="vip-spinner" /> Processing Payment...
                </span>
              ) : `Pay ₹${plan.price}`}
            </button>

            <p className="vip-secure-note">🔒 Secured & Encrypted Payment</p>
          </div>
        </div>
      </div>
    );
  }

  // Step 4 — Success
  if (step === 4 && booking) {
    const qrValue = JSON.stringify({ bookingId: booking.bookingId, type: 'VIP', plan: booking.plan.name, name: booking.name, visitDate: booking.visitDate });
    return (
      <div className="vip-root">
        <div className="vip-inner vip-inner-sm">
          <div className="vip-success-card">
            <div className="vip-success-icon">✅</div>
            <h2>Payment Successful!</h2>
            <div className="vip-success-badge" style={{color: booking.plan.color, borderColor: booking.plan.color, background: `${booking.plan.color}18`}}>
              {booking.plan.name}
            </div>
            <p className="vip-booking-id">Booking ID: <strong>{booking.bookingId}</strong></p>

            <div className="vip-success-details">
              <div className="vip-detail-row"><span>Name</span><strong>{booking.name}</strong></div>
              <div className="vip-detail-row"><span>Phone</span><strong>{booking.phone}</strong></div>
              <div className="vip-detail-row"><span>Visit Date</span><strong>{new Date(booking.visitDate).toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</strong></div>
              <div className="vip-detail-row"><span>Amount Paid</span><strong style={{color:'#2dc653'}}>₹{booking.plan.price}</strong></div>
            </div>

            <div className="vip-qr-wrapper">
              <QRCodeCanvas value={qrValue} size={180} bgColor="#0f0f2a" fgColor="#a78bfa" level="H" includeMargin={true} />
            </div>
            <p className="vip-qr-hint">Show this VIP QR at the entrance for priority access</p>

            <div className="vip-success-actions">
              <button className="vip-btn" onClick={() => { setStep(1); setSelected(null); setFormData({name:'',phone:'',email:'',visitDate:''}); setCard({number:'',expiry:'',cvv:'',holder:''}); setBooking(null); }}>
                Book Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default VIPPass;
