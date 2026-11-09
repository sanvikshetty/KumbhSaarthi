import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import jsQR from 'jsqr';
import '../styles/QRScanner.css';

function QRScanner() {
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [toast, setToast]           = useState(null);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const scannedRef  = useRef(false);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const tick = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    console.log('tick - video size:', canvas.width, 'x', canvas.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && !scannedRef.current) {
      console.log('QR DETECTED:', code.data);
      scannedRef.current = true;
      stopCamera();
      setScanning(false);
      handleScan(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopCamera]); // eslint-disable-line

  const startScanner = async () => {
    setError('');
    setResult(null);
    scannedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError('Camera access denied. Please allow camera permission and try again.');
    }
  };

  const handleScan = async (decodedText) => {
    setProcessing(true);
    try {
      const data = JSON.parse(decodedText);
      const q = query(collection(db, 'bookings'), where('bookingId', '==', data.bookingId));
      const snap = await getDocs(q);
      if (snap.empty) {
        showToast(`❌ No booking found for ID: ${data.bookingId}`, 'error');
        setError(`No booking found for ID: ${data.bookingId}`);
        setProcessing(false);
        return;
      }
      const docSnap = snap.docs[0];
      showToast('✅ Valid booking found!', 'success');
      setResult({ visitor: { id: docSnap.id, ...docSnap.data() }, docId: docSnap.id });
    } catch {
      showToast('❌ Invalid QR code!', 'error');
      setError('Invalid QR code. Please scan a valid KumbhSaarthi booking QR.');
    }
    setProcessing(false);
  };

  const updateStatus = async (status) => {
    setProcessing(true);
    const now = new Date();
    try {
      const updateData = { status };
      if (status === 'CHECKED_IN') {
        updateData.checkedInAt = now;
      } else if (status === 'CHECKED_OUT') {
        updateData.checkedOutAt = now;
        // calculate duration
        const checkedInAt = result.visitor.checkedInAt?.toDate
          ? result.visitor.checkedInAt.toDate()
          : result.visitor.checkedInAt
          ? new Date(result.visitor.checkedInAt)
          : null;
        if (checkedInAt) {
          const mins = Math.round((now - checkedInAt) / 60000);
          updateData.durationMins = mins;
        }
      }
      await updateDoc(doc(db, 'bookings', result.docId), updateData);
      setResult(prev => ({ ...prev, visitor: { ...prev.visitor, ...updateData } }));
      showToast(status === 'CHECKED_IN' ? '✅ Checked In!' : '🚪 Checked Out!', 'success');
    } catch (e) {
      showToast('❌ Failed to update. Try again.', 'error');
    }
    setProcessing(false);
  };

  const reset = () => {
    stopCamera();
    setScanning(false);
    setResult(null);
    setError('');
    scannedRef.current = false;
  };

  const getStatusColor = (s) =>
    s === 'CHECKED_IN' ? '#2dc653' : s === 'CHECKED_OUT' ? '#4cc9f0' : '#f4a261';

  return (
    <div className="qrs-root">
      <div className="qrs-inner">
        <h1 className="qrs-title">📷 QR Scanner</h1>
        <p className="qrs-subtitle">Scan visitor QR code to check in or check out</p>

        {toast && <div className={`qrs-toast qrs-toast-${toast.type}`}>{toast.msg}</div>}

        {!result && (
          <div className="qrs-card">

            {/* Video + canvas always in DOM */}
            <div className={`qrs-video-wrapper ${scanning ? 'qrs-video-visible' : ''}`}>
              <video ref={videoRef} className="qrs-video" playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {/* Corner frame overlay */}
              <div className="qrs-frame-overlay">
                <div className="qrs-frame">
                  <span className="qrs-corner qrs-tl" />
                  <span className="qrs-corner qrs-tr" />
                  <span className="qrs-corner qrs-bl" />
                  <span className="qrs-corner qrs-br" />
                  <div className="qrs-scan-line" />
                </div>
                <p className="qrs-scan-hint">Align QR code inside the box</p>
              </div>
            </div>

            {!scanning && !processing && (
              <div className="qrs-idle">
                <span className="qrs-idle-icon">📷</span>
                <p>Camera is off</p>
                <button className="qrs-btn-start" onClick={startScanner}>Start Scanning</button>
              </div>
            )}

            {scanning && (
              <button className="qrs-btn-stop" onClick={reset}>✕ Stop Camera</button>
            )}

            {processing && (
              <div className="qrs-idle">
                <div className="qrs-spinner" />
                <p>Looking up booking...</p>
              </div>
            )}

            {error && (
              <div className="qrs-error">
                ⚠️ {error}
                <button onClick={reset}>Try Again</button>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="qrs-result-card">
            <div className="qrs-result-header">
              <span className="qrs-result-icon">🎫</span>
              <div>
                <h2>{result.visitor.name}</h2>
                <span className="qrs-status-badge" style={{
                  color: getStatusColor(result.visitor.status),
                  borderColor: getStatusColor(result.visitor.status),
                  background: `${getStatusColor(result.visitor.status)}18`
                }}>
                  {result.visitor.status}
                </span>
              </div>
            </div>

            <div className="qrs-details">
              <div className="qrs-detail-row"><span>Booking ID</span><strong>{result.visitor.bookingId}</strong></div>
              <div className="qrs-detail-row"><span>Phone</span><strong>{result.visitor.phone}</strong></div>
              <div className="qrs-detail-row"><span>People</span><strong>{result.visitor.numberOfPeople}</strong></div>
              <div className="qrs-detail-row"><span>Scheduled Visit</span><strong>{result.visitor.visitDateTime ? new Date(result.visitor.visitDateTime).toLocaleString() : '—'}</strong></div>
              <div className="qrs-detail-row"><span>ID Proof</span><strong>{result.visitor.idProof}</strong></div>
              {result.visitor.checkedInAt && (
                <div className="qrs-detail-row">
                  <span>🟢 Entered At</span>
                  <strong style={{color:'#2dc653'}}>
                    {result.visitor.checkedInAt?.toDate
                      ? result.visitor.checkedInAt.toDate().toLocaleString()
                      : new Date(result.visitor.checkedInAt).toLocaleString()}
                  </strong>
                </div>
              )}
              {result.visitor.checkedOutAt && (
                <div className="qrs-detail-row">
                  <span>🔴 Exited At</span>
                  <strong style={{color:'#4cc9f0'}}>
                    {result.visitor.checkedOutAt?.toDate
                      ? result.visitor.checkedOutAt.toDate().toLocaleString()
                      : new Date(result.visitor.checkedOutAt).toLocaleString()}
                  </strong>
                </div>
              )}
              {result.visitor.durationMins !== undefined && (
                <div className="qrs-detail-row">
                  <span>⏱️ Time Spent</span>
                  <strong style={{color:'#f4a261'}}>
                    {result.visitor.durationMins >= 60
                      ? `${Math.floor(result.visitor.durationMins / 60)}h ${result.visitor.durationMins % 60}m`
                      : `${result.visitor.durationMins} mins`}
                  </strong>
                </div>
              )}
            </div>

            <div className="qrs-actions">
              {/* Always show Entry/Exit choice after scan */}
              <div className="qrs-entry-exit">
                <button
                  className="qrs-btn-entry"
                  onClick={() => updateStatus('CHECKED_IN')}
                  disabled={processing || result.visitor.status === 'CHECKED_IN' || result.visitor.status === 'CHECKED_OUT'}
                >
                  {processing ? '...' : '🟢 Entry'}
                </button>
                <button
                  className="qrs-btn-exit"
                  onClick={() => updateStatus('CHECKED_OUT')}
                  disabled={processing || result.visitor.status === 'REGISTERED' || result.visitor.status === 'CHECKED_OUT'}
                >
                  {processing ? '...' : '🔴 Exit'}
                </button>
              </div>
              {result.visitor.status === 'CHECKED_OUT' && (
                <div className="qrs-completed">✓ Visit Completed</div>
              )}
              <button className="qrs-btn-scan-again" onClick={reset}>Scan Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QRScanner;
