import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/Visitors.css';

const TODAY = new Date().toISOString().split('T')[0];

function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [tokens,   setTokens]   = useState([]);
  const [filter,   setFilter]   = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | ONLINE | WALKIN
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), snap => {
      setVisitors(snap.docs.map(d => ({ id: d.id, _type: 'online', ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tokens'), snap => {
      const today = snap.docs.map(d => ({ id: d.id, _type: 'walkin', ...d.data() }))
        .filter(t => t.date === TODAY);
      setTokens(today);
    });
    return () => unsub();
  }, []);

  const updateBookingStatus = async (id, status) => {
    const now = new Date();
    const updateData = { status };
    if (status === 'CHECKED_IN')  updateData.checkedInAt  = now;
    if (status === 'CHECKED_OUT') {
      updateData.checkedOutAt = now;
      const v = visitors.find(x => x.id === id);
      const inAt = v?.checkedInAt?.toDate ? v.checkedInAt.toDate() : v?.checkedInAt ? new Date(v.checkedInAt) : null;
      if (inAt) updateData.durationMins = Math.round((now - inAt) / 60000);
    }
    await updateDoc(doc(db, 'bookings', id), updateData);
  };

  const getStatusClass = (status) => {
    if (status === 'CHECKED_IN'  || status === 'SERVING')  return 'status-checked-in';
    if (status === 'CHECKED_OUT' || status === 'DONE')     return 'status-checked-out';
    return 'status-registered';
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    return (ts?.toDate ? ts.toDate() : new Date(ts)).toLocaleString();
  };

  const formatDuration = (mins) => {
    if (mins === undefined || mins === null) return '—';
    return mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`;
  };

  // Merge both lists
  const allVisitors = [
    ...visitors,
    ...tokens.map(t => ({
      id: t.id, _type: 'walkin',
      name: t.name, phone: t.phone,
      numberOfPeople: t.people,
      visitDateTime: t.issuedAt,
      checkedInAt: t.enteredAt,
      checkedOutAt: t.exitedAt,
      durationMins: t.durationMins,
      status: t.status === 'SERVING' ? 'CHECKED_IN' : t.status === 'DONE' ? 'CHECKED_OUT' : 'REGISTERED',
      tokenId: t.tokenId,
    }))
  ];

  const filtered = allVisitors.filter(v => {
    const matchStatus = filter === 'ALL' || v.status === filter;
    const matchType   = typeFilter === 'ALL' || v._type === typeFilter.toLowerCase();
    const matchSearch = !search ||
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.phone?.includes(search);
    return matchStatus && matchType && matchSearch;
  });

  const onlineCount = visitors.length;
  const walkinCount = tokens.length;
  const insideCount = allVisitors.filter(v => v.status === 'CHECKED_IN').length;
  const doneCount   = allVisitors.filter(v => v.status === 'CHECKED_OUT').length;

  return (
    <div className="visitors">
      <div className="container">
        <h1 className="page-title">👥 Visitors</h1>

        <div className="visitors-header">
          <div className="filter-buttons">
            <button className={filter === 'ALL'         ? 'active' : ''} onClick={() => setFilter('ALL')}>All ({allVisitors.length})</button>
            <button className={filter === 'REGISTERED'  ? 'active' : ''} onClick={() => setFilter('REGISTERED')}>Pending</button>
            <button className={filter === 'CHECKED_IN'  ? 'active' : ''} onClick={() => setFilter('CHECKED_IN')}>Inside</button>
            <button className={filter === 'CHECKED_OUT' ? 'active' : ''} onClick={() => setFilter('CHECKED_OUT')}>Exited</button>
          </div>
          <div className="filter-buttons">
            <button className={typeFilter === 'ALL'    ? 'active' : ''} onClick={() => setTypeFilter('ALL')}>🌐+🚶 All</button>
            <button className={typeFilter === 'ONLINE' ? 'active' : ''} onClick={() => setTypeFilter('ONLINE')}>🌐 Online</button>
            <button className={typeFilter === 'WALKIN' ? 'active' : ''} onClick={() => setTypeFilter('WALKIN')}>🚶 Walk-in</button>
          </div>
          <div className="search-box">
            <input type="text" placeholder="Search by name or phone..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <p style={{textAlign:'center',padding:'40px',color:'#7c3aed',fontWeight:600}}>Loading visitors...</p>
          ) : filtered.length === 0 ? (
            <p style={{textAlign:'center',padding:'40px',color:'#8b8bb5'}}>No visitors found.</p>
          ) : (
            <table className="visitors-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>People</th>
                  <th>Entered At</th>
                  <th>Exited At</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.id}>
                    <td>{i + 1}</td>
                    <td>
                      {v._type === 'online'
                        ? <span className="vis-type-badge vis-online">🌐 Online</span>
                        : <span className="vis-type-badge vis-walkin">🚶 Walk-in {v.tokenId && `(${v.tokenId})`}</span>
                      }
                    </td>
                    <td>{v.name}</td>
                    <td>{v.phone}</td>
                    <td>{v.numberOfPeople}</td>
                    <td style={{fontSize:'.8rem',color:'#2dc653'}}>{formatTime(v.checkedInAt)}</td>
                    <td style={{fontSize:'.8rem',color:'#4cc9f0'}}>{formatTime(v.checkedOutAt)}</td>
                    <td style={{fontSize:'.8rem',color:'#f4a261'}}>{formatDuration(v.durationMins)}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(v.status)}`}>{v.status}</span>
                    </td>
                    <td>
                      {v._type === 'online' && v.status === 'REGISTERED' && (
                        <button className="action-btn btn-checkin" onClick={() => updateBookingStatus(v.id, 'CHECKED_IN')}>Check In</button>
                      )}
                      {v._type === 'online' && v.status === 'CHECKED_IN' && (
                        <button className="action-btn btn-checkout" onClick={() => updateBookingStatus(v.id, 'CHECKED_OUT')}>Check Out</button>
                      )}
                      {v._type === 'online' && v.status === 'CHECKED_OUT' && <span className="completed">✓ Done</span>}
                      {v._type === 'walkin' && <span style={{fontSize:'.78rem',color:'#8b8bb5'}}>Via Token</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <h3>🌐 Online</h3>
            <div className="summary-value">{onlineCount}</div>
          </div>
          <div className="summary-card">
            <h3>🚶 Walk-in</h3>
            <div className="summary-value">{walkinCount}</div>
          </div>
          <div className="summary-card">
            <h3>Currently Inside</h3>
            <div className="summary-value">{insideCount}</div>
          </div>
          <div className="summary-card">
            <h3>Completed</h3>
            <div className="summary-value">{doneCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Visitors;
