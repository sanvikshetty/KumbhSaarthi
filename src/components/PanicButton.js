import React,{useState,useEffect} from 'react';
import {collection,addDoc,onSnapshot,query,where} from 'firebase/firestore';
import {db} from '../firebase';
import './PanicButton.css';
const ZONES=[
{id:'main_sanctum',label:'Main Sanctum',icon:'🏛️'},{id:'entrance_steps',label:'Entrance Steps',icon:'🪜'},
{id:'bathing_ghat',label:'Bathing Ghat',icon:'🚿'},{id:'prasad_counter',label:'Prasad Counter',icon:'🍽️'},
{id:'parking',label:'Parking Area',icon:'🅿️'},{id:'restrooms',label:'Restrooms',icon:'🚻'},
{id:'garden',label:'Garden Area',icon:'🌳'},{id:'medical',label:'Medical Room',icon:'🏥'},
{id:'queue_line',label:'Queue Line',icon:'🧍'},{id:'exit_gate',label:'Exit Gate',icon:'🚪'}];
const playBeep=()=>{try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.setValueAtTime(880,ctx.currentTime);osc.frequency.setValueAtTime(660,ctx.currentTime+.15);gain.gain.setValueAtTime(.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.4);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+.4);}catch(e){console.log('Audio not supported');}};
function PanicButton({user}){
 const[status,setStatus]=useState('idle'),[alertId,setAlertId]=useState(null),[alertData,setAlertData]=useState(null);
 useEffect(()=>{if(!alertId)return;return onSnapshot(query(collection(db,'alerts'),where('__name__','==',alertId)),snap=>{if(!snap.empty)setAlertData({id:snap.docs[0].id,...snap.docs[0].data()});});},[alertId]);
 if(!user||user.role!=='visitor')return null;
 const openPicker=()=>{if(status==='idle')setStatus('picking');};
 const sendAlert=async zone=>{setStatus('sending');playBeep();try{const ref=await addDoc(collection(db,'alerts'),{type:'PANIC',visitorName:user.name,visitorEmail:user.email,message:`🚨 PANIC ALERT from ${user.name} — Location: ${zone.icon} ${zone.label}`,locationStr:`${zone.icon} ${zone.label}`,zone:zone.id,zoneName:zone.label,zoneIcon:zone.icon,timestamp:new Date(),read:false,dispatched:false});setAlertId(ref.id);setStatus('sent');}catch(e){setStatus('idle');}};
 return <>{status==='picking'&&<div className="panic-overlay"><div className="panic-modal"><div className="panic-modal-header"><h3>🚨 Where are you?</h3><p>Select your current location within the pilgrimage area</p></div><div className="panic-zones">{ZONES.map(zone=><button key={zone.id} className="panic-zone-btn" onClick={()=>sendAlert(zone)}><span className="panic-zone-icon">{zone.icon}</span><span className="panic-zone-label">{zone.label}</span></button>)}</div><button className="panic-modal-cancel" onClick={()=>setStatus('idle')}>✕ Cancel</button></div></div>}{status==='sending'&&<div className="panic-overlay"><div className="panic-modal"><p>Sending emergency alert...</p></div></div>}<div className="panic-wrapper">{status==='sent'&&<div className="panic-live-status">{alertData?.read?<div className="panic-status-card panic-status-resolved">✅ Help has arrived — Stay calm</div>:alertData?.dispatched?<div className="panic-status-card panic-status-dispatched">🏃 Help is on the way!</div>:<div className="panic-status-card panic-status-waiting">⏳ Alert sent — Waiting...</div>}</div>}<button className={`panic-btn ${status==='sent'?(alertData?.read?'panic-sent':'panic-btn-active'):''}`} onClick={openPicker} disabled={status!=='idle'} title="Send emergency alert"><span>{alertData?.read?'✅':'🆘'}</span><span className="panic-label">{alertData?.read?'Resolved':status==='sent'?'SENT':'PANIC'}</span></button></div></>;
}
export default PanicButton;
