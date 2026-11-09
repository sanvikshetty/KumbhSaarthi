import React, { useState, useRef, useEffect } from 'react';
import '../styles/ConciergeChat.css';

const FAQS = [
  { label: '🕐 Temple Timings', answer: 'Temple timings are shown on the visitor information page.' },
  { label: '📋 How to Register?', answer: 'Go to Registration, fill in your details, select a visit date and time, and submit.' },
  { label: '📱 How to Check In?', answer: 'Show your booking QR code to staff at the entrance for scanning.' },
  { label: '🅿️ Parking Info', answer: 'You can pre-book a parking slot from the Book Parking page after logging in.' },
  { label: '👑 VIP Pass', answer: 'Apply from the VIP Pass page. Approval is subject to availability.' },
  { label: '👥 Group Visit', answer: 'For larger group visits, contact the KumbhSaarthi help desk.' },
  { label: '❌ Cancel Booking', answer: 'Please contact the KumbhSaarthi help desk for cancellation assistance.' },
];
const BOT='bot', USER='user';
const autoReply = (text) => {
  const t=text.toLowerCase();
  if(t.includes('time')||t.includes('open')||t.includes('hour')) return FAQS[0].answer;
  if(t.includes('register')||t.includes('book')) return FAQS[1].answer;
  if(t.includes('check in')||t.includes('checkin')||t.includes('qr')) return FAQS[2].answer;
  if(t.includes('park')) return FAQS[3].answer;
  if(t.includes('vip')) return FAQS[4].answer;
  if(t.includes('group')) return FAQS[5].answer;
  if(t.includes('cancel')) return FAQS[6].answer;
  return "I'm not sure about that. Please try one of the quick questions below. 🙏";
};
export default function ConciergeChat(){
 const [open,setOpen]=useState(false);
 const [messages,setMessages]=useState([{from:BOT,text:"Namaste! 🙏 I'm your KumbhSaarthi Concierge. How can I help you today?"}]);
 const [input,setInput]=useState('');
 const [unread,setUnread]=useState(0);
 const bottomRef=useRef(null);
 useEffect(()=>{if(open){setUnread(0);bottomRef.current?.scrollIntoView({behavior:'smooth'});}},[open,messages]);
 const addMessage=(from,text)=>{setMessages(prev=>[...prev,{from,text}]);if(from===BOT&&!open)setUnread(u=>u+1);};
 const handleFAQ=faq=>{addMessage(USER,faq.label);setTimeout(()=>addMessage(BOT,faq.answer),400);};
 const handleSend=()=>{const trimmed=input.trim();if(!trimmed)return;addMessage(USER,trimmed);setInput('');setTimeout(()=>addMessage(BOT,autoReply(trimmed)),500);};
 const handleKey=e=>{if(e.key==='Enter')handleSend();};
 return <>{open&&<div className="cc-window"><div className="cc-header"><span>🛎️ Concierge Assistance</span><button className="cc-close" onClick={()=>setOpen(false)}>✕</button></div><div className="cc-messages">{messages.map((m,i)=><div key={i} className={`cc-msg cc-msg-${m.from}`}>{m.text}</div>)}<div ref={bottomRef}/></div><div className="cc-faqs">{FAQS.map((f,i)=><button key={i} className="cc-faq-btn" onClick={()=>handleFAQ(f)}>{f.label}</button>)}</div><div className="cc-input-row"><input className="cc-input" placeholder="Type your question..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}/><button className="cc-send" onClick={handleSend}>➤</button></div></div>}<button className="cc-fab" onClick={()=>setOpen(o=>!o)} title="Concierge Assistance">{open?'✕':'💬'}{!open&&<span className="cc-fab-label">Help</span>}{!open&&unread>0&&<span className="cc-badge">{unread}</span>}</button></>;
}
