import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import emailjs from '@emailjs/browser';
import '../styles/Registration.css';

const EJS_SERVICE  = 'service_templeflow';
const EJS_TEMPLATE = 'template_iqqzd2j';
const EJS_PUBLIC   = '-AaNGxkJPQTZ_FM92';

function Registration() {
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '',
    numberOfPeople: '', visitDateTime: '', idProof: ''
  });
  const [booking, setBooking]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [capacityInfo, setCapacityInfo] = useState(null); // { booked, limit, isFull }
  const qrRef = useRef(null);

  useEffect(() => {
    const checkCapacity = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const limitDoc = await getDoc(doc(db, 'settings', 'dailyLimits'));
        const limit = limitDoc.exists() ? (limitDoc.data()[today] || 400) : 400;
        const q = query(collection(db, 'bookings'), where('visitDateTime', '>=', today), where('visitDateTime', '<', today + 'T99'));
        const snap = await getDocs(q);
        const booked = snap.docs
          .filter(d => d.data().status !== 'CANCELLED')
          .reduce((sum, d) => sum + (parseInt(d.data().numberOfPeople) || 1), 0);
        setCapacityInfo({ booked, limit, isFull: booked >= limit });
      } catch (e) {}
    };
    checkCapacity();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // check daily limit
      const visitDate = formData.visitDateTime.split('T')[0];
      const limitDoc = await getDoc(doc(db, 'settings', 'dailyLimits'));
      const dayLimit = limitDoc.exists() ? (limitDoc.data()[visitDate] || 500) : 500;
      const q = query(collection(db, 'bookings'), where('visitDateTime', '>=', visitDate), where('visitDateTime', '<', visitDate + 'T99'));
      const snap = await getDocs(q);
      const dayTotal = snap.docs
        .filter(d => d.data().status !== 'CANCELLED')
        .reduce((sum, d) => sum + (parseInt(d.data().numberOfPeople) || 1), 0);
      if (dayTotal + parseInt(formData.numberOfPeople) > dayLimit) {
        setError(`Sorry! Maximum capacity of ${dayLimit} visitors for ${visitDate} is reached. Please choose another date.`);
        setLoading(false);
        return;
      }
      const bookingId = 'TMP' + Math.floor(Math.random() * 90000 + 10000);
      await addDoc(collection(db, 'bookings'), {
        ...formData, bookingId, status: 'REGISTERED', createdAt: new Date()
      });
      setBooking({ ...formData, bookingId });
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${booking.bookingId}-qr.png`;
    a.click();
  };

  const emailQR = async () => {
    if (!booking.email) { setEmailStatus('nomail'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(booking.email)) { setEmailStatus('invalid'); return; }
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    setEmailStatus('sending');
    try {
      await emailjs.send(EJS_SERVICE, EJS_TEMPLATE, {
        to_email:   booking.email.trim(),
        to_name:    booking.name,
        booking_id: booking.bookingId,
        visit_time: new Date(booking.visitDateTime).toLocaleString(),
        people:     String(booking.numberOfPeople),
      }, EJS_PUBLIC);
      setEmailStatus('sent');
    } catch {
      setEmailStatus('error');
    }
  };

  const shareWhatsApp = () => {
    const msg = `*KumbhSaarthi — Booking Confirmed!*
━━━━━━━━━━━━━━━━━━━━
*Booking ID:* ${booking.bookingId}
*Name:* ${booking.name}
*Visit Date:* ${new Date(booking.visitDateTime).toLocaleString()}
*Visitors:* ${booking.numberOfPeople}
*ID Proof:* ${booking.idProof.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━
Show your QR code at the entrance for quick check-in.
Please arrive 15 mins before your scheduled time.
━━━━━━━━━━━━━━━━━━━━
_Powered by KumbhSaarthi_`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const resetForm = () => {
    setBooking(null);
    setEmailStatus('');
    setFormData({ name: '', phone: '', email: '', numberOfPeople: '', visitDateTime: '', idProof: '' });
  };

  const qrValue = booking ? JSON.stringify({
    bookingId: booking.bookingId,
    name: booking.name,
    phone: booking.phone,
    visitDateTime: booking.visitDateTime,
    numberOfPeople: booking.numberOfPeople,
    status: 'REGISTERED'
  }) : '';

  if (booking) {
    return (
      <div className="registration">
        <div className="container">
          <h1 className="page-title">📝 Visitor Registration</h1>
          <div className="qr-success-container">
            <div className="qr-success-card">
              <div className="qr-success-icon">✅</div>
              <h2>Registration Successful!</h2>
              <p className="qr-booking-id">Booking ID: <strong>{booking.bookingId}</strong></p>

              <div className="qr-details">
                <div className="qr-detail-row"><span>Name</span><strong>{booking.name}</strong></div>
                <div className="qr-detail-row"><span>Phone</span><strong>{booking.phone}</strong></div>
                <div className="qr-detail-row"><span>People</span><strong>{booking.numberOfPeople}</strong></div>
                <div className="qr-detail-row"><span>Visit</span><strong>{new Date(booking.visitDateTime).toLocaleString()}</strong></div>
              </div>

              <div className="qr-code-wrapper" ref={qrRef}>
                <QRCodeCanvas
                  value={qrValue}
                  size={200}
                  bgColor="#0f0f2a"
                  fgColor="#a78bfa"
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p className="qr-hint">Show this QR code at the entrance for quick check-in</p>

              {emailStatus === 'sent'    && <div className="message success">✅ QR sent to {booking.email}</div>}
              {emailStatus === 'error'   && <div className="message error">❌ Failed to send. Try again.</div>}
              {emailStatus === 'nomail'  && <div className="message error">❌ No email address provided.</div>}
              {emailStatus === 'invalid' && <div className="message error">❌ Invalid email address.</div>}

              <div className="qr-actions">
                <button className="btn-download-qr" onClick={downloadQR}>⬇️ Download QR</button>
                {booking.email && (
                  <button className="btn-email-qr" onClick={emailQR} disabled={emailStatus === 'sending' || emailStatus === 'sent'}>
                    {emailStatus === 'sending' ? '📤 Sending...' : emailStatus === 'sent' ? '✅ Sent!' : '📧 Email QR'}
                  </button>
                )}
                <button className="btn-whatsapp" onClick={shareWhatsApp}>💬 WhatsApp</button>
                <button className="btn-new-reg" onClick={resetForm}>+ New Registration</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full capacity screen
  if (capacityInfo?.isFull) {
    return (
      <div className="registration">
        <div className="container">
          <div className="reg-full-screen">
            <div className="reg-full-icon">🚫</div>
            <h2>Today's Capacity is Full</h2>
            <p>We have reached the maximum limit of <strong>{capacityInfo.limit}</strong> visitors for today.</p>
            <div className="reg-full-stats">
              <div><span>Booked Today</span><strong>{capacityInfo.booked}</strong></div>
              <div><span>Max Capacity</span><strong>{capacityInfo.limit}</strong></div>
            </div>
            <p className="reg-full-hint">Please try booking for a different date. We apologize for the inconvenience. 🙏</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registration">
      <div className="container">
        <h1 className="page-title">📝 Visitor Registration</h1>
        <div className="registration-container">
          <div className="registration-info">
            <h2>Registration Guidelines</h2>
            <ul>
              <li>✓ All visitors must register before visiting</li>
              <li>✓ Carry a valid ID proof</li>
              <li>✓ Follow temple timings: 6 AM - 8 PM</li>
              <li>✓ Maximum 10 people per booking</li>
              <li>✓ Arrive 15 minutes before scheduled time</li>
              <li>✓ Follow COVID-19 safety protocols</li>
            </ul>
            <div className="timing-card">
              <h3>Temple Timings</h3>
              <p><strong>Morning:</strong> 6:00 AM - 12:00 PM</p>
              <p><strong>Evening:</strong> 4:00 PM - 8:00 PM</p>
              <p><strong>Special Darshan:</strong> 5:00 AM - 12:00 PM</p>
            </div>
          </div>

          <div className="registration-form-card">
            <form onSubmit={handleSubmit} className="registration-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Enter your full name" />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="10-digit mobile number" pattern="[0-9]{10}" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your.email@example.com" />
              </div>
              <div className="form-group">
                <label>Number of People *</label>
                <input type="number" name="numberOfPeople" value={formData.numberOfPeople} onChange={handleChange} required min="1" max="10" placeholder="1-10 people" />
              </div>
              <div className="form-group">
                <label>Visit Date & Time *</label>
                <input type="datetime-local" name="visitDateTime" value={formData.visitDateTime} onChange={handleChange} required min={new Date().toISOString().slice(0,16)} />
              </div>
              <div className="form-group">
                <label>ID Proof Type *</label>
                <select name="idProof" value={formData.idProof} onChange={handleChange} required>
                  <option value="">Select ID Proof</option>
                  <option value="aadhar">Aadhar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="driving">Driving License</option>
                  <option value="passport">Passport</option>
                  <option value="voter">Voter ID</option>
                </select>
              </div>
              {error && <div className="message error">{error}</div>}
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Registering...' : 'Register Visit'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Registration;
