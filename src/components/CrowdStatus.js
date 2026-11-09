import React, { useState } from 'react';
import '../styles/CrowdStatus.css';
function CrowdStatus(){
 const [crowdData]=useState({current:245,capacity:500,status:'MODERATE'});
 const percentage=((crowdData.current/crowdData.capacity)*100).toFixed(1);
 const getStatusColor=()=>percentage>=90?'#dc3545':percentage>=70?'#ffc107':percentage>=50?'#17a2b8':'#28a745';
 return <div className="crowd-status-card"><h2>🚦 Current Crowd Status</h2><div className="status-display"><div className="status-item"><span className="label">Current Occupancy:</span><span className="value">{crowdData.current}</span></div><div className="status-item"><span className="label">Capacity:</span><span className="value">{crowdData.capacity}</span></div><div className="status-item"><span className="label">Status:</span><span className="badge" style={{background:getStatusColor()}}>{crowdData.status}</span></div><div className="progress-bar"><div className="progress-fill" style={{width:`${percentage}%`,background:getStatusColor()}}/></div><p className="percentage-text">{percentage}% Occupied</p></div></div>;
}
export default CrowdStatus;
