import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import '../styles/MyBookings.css';

function MyBookings() {
  const [bookings,     setBookings]     = useState([]);
  const [parkings,     setParkings]     = useState([]);
  const [vipBookings,  setVipBookings]  = useState([]);
  const [pujaBookings, setPujaBookings] = useState([]);
  const [prasadOrders, setPrasadOrders] = useState([]);
  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState(null);
  const [cancelling,   setCancelling]   = useState(null);
  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const userRef  = useRef(user);
  const qrRefs  = useRef({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const u = userRef.current;
    if (!u.name && !u.phone) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db, 'bookings'), snap => {
      const mine = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(b => (u.phone && b.phone === u.phone) || (u.name && b.name?.toLowerCase() === u.name.toLowerCase()));
      setBookings(mine); setLoading(false);
    });
    return () => unsub();
  }, [userRef]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const u = userRef.current;
    const unsub = onSnapshot(collection(db, 'parking'), snap => setParkings(
      snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => (u.phone && p.visitorPhone === u.phone) || (u.email && p.visitorEmail === u.email) || (u.name && p.visitorName?.toLowerCase() === u.name.toLowerCase()))
    ));
    return () => unsub();
  }, [userRef]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const u = userRef.current;
    const unsub = onSnapshot(collection(db, 'pujaBookings'), snap => {
      const mine = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(b => (u.phone && b.phone === u.phone) || (u.name && b.name?.toLowerCase() === u.name.toLowerCase()));
      setPujaBookings(mine);
    });
    return () => unsub();
  }, [userRef]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const u = userRef.current;
    const unsub = onSnapshot(collection(db, 'prasadOrders'), snap => {
      const mine = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(o => (u.phone && o.phone === u.phone) || (u.name && o.name?.toLowerCase() === u.name.toLowerCase()));
      setPrasadOrders(mine);
    });
    return () => unsub();
  }, [userRef]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const u = userRef.current;
    const unsub = onSnapshot(collection(db, 'vipBookings'), snap => {
      const mine = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(b => (u.phone && b.visitorPhone === u.phone) || (u.name && b.visitorName?.toLowerCase() === u.name.toLowerCase()) || (u.email && b.userEmail === u.email));
      setVipBookings(mine);
    });
    return () => unsub();
  }, [userRef]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const u = userRef.current;
    const unsub = onSnapshot(collection(db, 'visitorMessages'), snap => {
      const mine = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(m => (u.phone && m.phone === u.phone) || (u.name && m.visitorName?.toLowerCase() === u.name.toLowerCase()));
      mine.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMessages(mine);
    });
    return () => unsub();
  }, [userRef]);

  const dismissMessage = async (id) => {
    try { await updateDoc(doc(db, 'visitorMessages', id), { read: true }); } catch (e) {}
  };

  const cancelBooking = async (id) => {
    setCancelling(id);
    try { await updateDoc(doc(db, 'bookings', id), { status: 'CANCELLED' }); } catch (e) {}
    setCancelling(null);
  };

  const getParkingForBooking = (bookingId) =>
    parkings.find(p => (p.bookingId === bookingId || p.visitorName === user.name) && p.status === 'ACTIVE');

  const downloadQR = (bookingId) => {
    const canvas = qrRefs.current[bookingId]?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${bookingId}-qr.png`;
    a.click();
  };

  const getStatusColor = (s) =>
    s === 'CHECKED_IN' ? '#2dc653' : s === 'CHECKED_OUT' ? '#4cc9f0' : s === 'CANCELLED' ? '#ff4d6d' : '#f4a261';

  // Merge all bookings and sort by createdAt descending
  const allItems = [
    ...bookings.map(b     => ({ ...b, _type: 'visit',  _time: b.createdAt?.seconds || 0 })),
    ...pujaBookings.map(b => ({ ...b, _type: 'puja',   _time: b.createdAt?.seconds || 0 })),
    ...vipBookings.map(b  => ({ ...b, _type: 'vip',    _time: b.createdAt?.seconds || 0 })),
    ...prasadOrders.map(b => ({ ...b, _type: 'prasad', _time: b.createdAt?.seconds || 0 })),
  ].sort((a, b) => b._time - a._time);

  const renderVisit = (b) => {
    const qrVal = JSON.stringify({ bookingId: b.bookingId, name: b.name, phone: b.phone, visitDateTime: b.visitDateTime, numberOfPeople: b.numberOfPeople, status: b.status });
    return (
      <div className={`mb-card ${b.status === 'CANCELLED' ? 'mb-card-cancelled' : ''}`} key={b.id}>
        <div className="mb-card-header" onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
          <div className="mb-card-left">
            <span className="mb-type-tag mb-type-visit">🏛️ Visit</span>
            <span className="mb-booking-id">{b.bookingId}</span>
            <span className="mb-visit-date">{b.visitDateTime ? new Date(b.visitDateTime).toLocaleString() : '—'}</span>
          </div>
          <div className="mb-card-right">
            <span className="mb-status" style={{ color: getStatusColor(b.status), background: `${getStatusColor(b.status)}18`, borderColor: getStatusColor(b.status) }}>{b.status}</span>
            <span className="mb-chevron">{expanded === b.id ? '▲' : '▼'}</span>
          </div>
        </div>
        {expanded === b.id && (
          <div className="mb-card-body">
            <div className="mb-details">
              <div className="mb-detail-row"><span>Name</span><strong>{b.name}</strong></div>
              <div className="mb-detail-row"><span>Phone</span><strong>{b.phone}</strong></div>
              <div className="mb-detail-row"><span>People</span><strong>{b.numberOfPeople}</strong></div>
              <div className="mb-detail-row"><span>ID Proof</span><strong>{b.idProof}</strong></div>
              {getParkingForBooking(b.bookingId) && (
                <div className="mb-parking-slot">
                  <span>Parking Slot</span>
                  <div className="mb-slot-badge">
                    <strong>{getParkingForBooking(b.bookingId).slotId}</strong>
                    <span>{getParkingForBooking(b.bookingId).vehicleNumber?.toUpperCase()}</span>
                    <span>{getParkingForBooking(b.bookingId).vehicleType}</span>
                  </div>
                </div>
              )}
              {b.status === 'REGISTERED' && (
                <button className="mb-btn-cancel" onClick={() => cancelBooking(b.id)} disabled={cancelling === b.id}>
                  {cancelling === b.id ? 'Cancelling...' : '✕ Cancel Booking'}
                </button>
              )}
              {b.status === 'CANCELLED' && <div className="mb-cancelled-msg">This booking has been cancelled.</div>}
            </div>
            {b.status !== 'CANCELLED' && (
              <div className="mb-qr-section">
                <div className="mb-qr-wrapper" ref={el => qrRefs.current[b.bookingId] = el}>
                  <QRCodeCanvas value={qrVal} size={160} bgColor="#0f0f2a" fgColor="#a78bfa" level="H" includeMargin />
                </div>
                <button className="mb-btn-download" onClick={() => downloadQR(b.bookingId)}>⬇️ Download QR</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPuja = (p) => {
    const sc = p.status === 'CONFIRMED' ? '#2dc653' : p.status === 'COMPLETED' ? '#4cc9f0' : p.status === 'CANCELLED' ? '#ff4d6d' : '#f4a261';
    const qrVal = JSON.stringify({ bookingId: p.bookingId, type: 'PUJA', pujaName: p.pujaName, name: p.name });
    return (
      <div className="mb-card" key={p.id}>
        <div className="mb-card-header" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
          <div className="mb-card-left">
            <span className="mb-type-tag mb-type-puja">🪔 Puja</span>
            <span className="mb-booking-id">{p.bookingId}</span>
            <span className="mb-visit-date">{p.pujaName} · {p.visitDate ? new Date(p.visitDate).toLocaleDateString('en-IN') : '—'} {p.timeSlot && `· ${p.timeSlot}`}</span>
          </div>
          <div className="mb-card-right">
            <span className="mb-status" style={{ color: sc, background: `${sc}18`, borderColor: sc }}>{p.status}</span>
            <span className="mb-chevron">{expanded === p.id ? '▲' : '▼'}</span>
          </div>
        </div>
        {expanded === p.id && (
          <div className="mb-card-body">
            <div className="mb-details">
              <div className="mb-detail-row"><span>Puja</span><strong>{p.pujaName}</strong></div>
              <div className="mb-detail-row"><span>Name</span><strong>{p.name}</strong></div>
              <div className="mb-detail-row"><span>People</span><strong>{p.numberOfPeople}</strong></div>
              {p.deityName && <div className="mb-detail-row"><span>Deity</span><strong>{p.deityName}</strong></div>}
              <div className="mb-detail-row"><span>Amount</span><strong style={{ color: '#2dc653' }}>₹{p.pujaPrice?.toLocaleString('en-IN')}</strong></div>
              <div className="mb-detail-row"><span>Payment</span><strong>{p.paymentMode === 'online' ? '✅ Paid' : '🏛️ Pay at Temple'}</strong></div>
            </div>
            {p.status !== 'CANCELLED' && (
              <div className="mb-qr-section">
                <div className="mb-vip-qr-wrapper" ref={el => qrRefs.current[p.bookingId] = el}>
                  <QRCodeCanvas value={qrVal} size={160} bgColor="#0f0f2a" fgColor="#f4a261" level="H" includeMargin />
                </div>
                <button className="mb-btn-download" style={{ background: 'linear-gradient(135deg,#f4a261,#7c3aed)' }} onClick={() => downloadQR(p.bookingId)}>⬇️ Download QR</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderVIP = (v) => {
    const pc = v.planId === 'platinum' ? '#4cc9f0' : v.planId === 'gold' ? '#f4a261' : '#8b8bb5';
    const qrVal = JSON.stringify({ bookingId: v.bookingId, type: 'VIP', plan: v.plan, name: v.visitorName, visitDate: v.visitDate });
    return (
      <div className="mb-card" key={v.id} style={{ borderColor: `${pc}40` }}>
        <div className="mb-card-header" onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
          <div className="mb-card-left">
            <span className="mb-type-tag" style={{ color: pc, background: `${pc}18`, borderColor: pc }}>👑 {v.plan}</span>
            <span className="mb-booking-id">{v.bookingId}</span>
            <span className="mb-visit-date">{v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</span>
          </div>
          <div className="mb-card-right">
            <span className="mb-status" style={{ color: '#2dc653', background: 'rgba(45,198,83,.12)', borderColor: '#2dc653' }}>PAID ₹{v.amount}</span>
            <span className="mb-chevron">{expanded === v.id ? '▲' : '▼'}</span>
          </div>
        </div>
        {expanded === v.id && (
          <div className="mb-card-body">
            <div className="mb-details">
              <div className="mb-detail-row"><span>Name</span><strong>{v.visitorName}</strong></div>
              <div className="mb-detail-row"><span>Phone</span><strong>{v.visitorPhone}</strong></div>
              <div className="mb-detail-row"><span>Amount Paid</span><strong style={{ color: '#2dc653' }}>₹{v.amount}</strong></div>
            </div>
            <div className="mb-qr-section">
              <div className="mb-vip-qr-wrapper" ref={el => qrRefs.current[v.bookingId] = el}>
                <QRCodeCanvas value={qrVal} size={160} bgColor="#0f0f2a" fgColor={pc} level="H" includeMargin />
              </div>
              <button className="mb-btn-download" style={{ background: `linear-gradient(135deg,${pc},#7c3aed)` }} onClick={() => downloadQR(v.bookingId)}>⬇️ Download QR</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPrasad = (o) => {
    const sc = o.status === 'COLLECTED' ? '#2dc653' : o.status === 'READY' ? '#4cc9f0' : o.status === 'CANCELLED' ? '#ff4d6d' : '#f4a261';
    return (
      <div className="mb-card" key={o.id}>
        <div className="mb-card-header" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
          <div className="mb-card-left">
            <span className="mb-type-tag mb-type-prasad">🙏 Prasad</span>
            <span className="mb-booking-id">{o.orderId}</span>
            <span className="mb-visit-date">{o.items?.map(i => i.name).join(', ')} · {o.pickupDate ? new Date(o.pickupDate).toLocaleDateString('en-IN') : '—'}</span>
          </div>
          <div className="mb-card-right">
            <span className="mb-status" style={{ color: sc, background: `${sc}18`, borderColor: sc }}>{o.status}</span>
            <span className="mb-chevron">{expanded === o.id ? '▲' : '▼'}</span>
          </div>
        </div>
        {expanded === o.id && (
          <div className="mb-card-body">
            <div className="mb-details">
              {o.items?.map(i => <div key={i.id} className="mb-detail-row"><span>{i.name}</span><strong style={{ color: '#f4a261' }}>₹{i.price}</strong></div>)}
              <div className="mb-detail-row"><span>Total</span><strong style={{ color: '#2dc653' }}>₹{o.totalAmount}</strong></div>
              <div className="mb-detail-row"><span>Pickup Time</span><strong>{o.timeSlot}</strong></div>
              <div className="mb-detail-row"><span>Payment</span><strong>{o.paymentMode === 'online' ? '✅ Paid' : '🏛️ Pay at Temple'}</strong></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-root">
      <div className="mb-inner">
        <h1 className="mb-title">🎫 My Bookings</h1>
        <p className="mb-subtitle">All your bookings — most recent first</p>

        {/* Authority Messages */}
        {messages.filter(m => !m.read).map(m => (
          <div key={m.id} className="mb-authority-msg">
            <div className="mb-authority-msg-left">
              <span className="mb-authority-icon">🚨</span>
              <div>
                <strong>Notice from KumbhSaarthi Authorities</strong>
                <p>{m.message}</p>
              </div>
            </div>
            <button className="mb-authority-dismiss" onClick={() => dismissMessage(m.id)}>✕</button>
          </div>
        ))}

        {loading ? (
          <div className="mb-loading"><div className="mb-spinner" /><span>Loading bookings...</span></div>
        ) : allItems.length === 0 ? (
          <div className="mb-empty">
            <span>📭</span>
            <p>No bookings found.</p>
            <a href="/registration" className="mb-btn-register">Register a Visit</a>
          </div>
        ) : (
          <div className="mb-list">
            {allItems.map(item => {
              if (item._type === 'visit')  return renderVisit(item);
              if (item._type === 'puja')   return renderPuja(item);
              if (item._type === 'vip')    return renderVIP(item);
              if (item._type === 'prasad') return renderPrasad(item);
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBookings;
