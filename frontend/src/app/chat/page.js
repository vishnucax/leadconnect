'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getGuestId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('guestId');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    localStorage.setItem('guestId', id);
  }
  return id;
}

export default function ChatPage() {
  const router = useRouter();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [mediaError, setMediaError] = useState(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [requiresPlay, setRequiresPlay] = useState(false);
  const [pipPos, setPipPos] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const pendingRef = useRef([]);
  const partnerRef = useRef(null);
  const pipRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('chat-body');
    document.body.classList.remove('landing-body');
    return () => document.body.classList.remove('chat-body');
  }, []);

  const initMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setIsMediaReady(true);
      return stream;
    } catch (err) {
      setMediaError('Camera/mic access denied.');
      setIsMediaReady(true);
      return null;
    }
  }, []);

  const cleanupPeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    pendingRef.current = [];
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const handleCleanup = useCallback((msg = true) => {
    cleanupPeer();
    if (msg && partnerRef.current)
      setMessages(p => [...p, { text: 'Stranger disconnected.', isSystem: true }]);
    partnerRef.current = null;
    setPartner(null);
    setIsMatching(false);
    setRequiresPlay(false);
  }, [cleanupPeer]);

  const startWebRTC = useCallback(async (initiator, relay = false) => {
    const sock = socketRef.current;
    if (!sock) return;
    cleanupPeer();

    let iceConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    try {
      const r = await fetch(`${SOCKET_URL}/api/turn`);
      if (r.ok) iceConfig = await r.json();
    } catch {}

    if (relay) iceConfig.iceTransportPolicy = 'relay';
    const pc = new RTCPeerConnection(iceConfig);
    peerRef.current = pc;

    sock.off('offer').on('offer', async (offer) => {
      await pc.setRemoteDescription(offer);
      for (const c of pendingRef.current) await pc.addIceCandidate(c).catch(() => {});
      pendingRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sock.emit('answer', answer);
    });

    sock.off('answer').on('answer', async (answer) => {
      if (pc.signalingState !== 'have-local-offer') return;
      await pc.setRemoteDescription(answer);
      for (const c of pendingRef.current) await pc.addIceCandidate(c).catch(() => {});
      pendingRef.current = [];
    });

    sock.off('ice-candidate').on('ice-candidate', async (c) => {
      if (pc.remoteDescription?.type) await pc.addIceCandidate(c).catch(() => {});
      else pendingRef.current.push(c);
    });

    pc.ontrack = (e) => {
      if (e.streams[0] && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
        remoteVideoRef.current.play().catch(() => setRequiresPlay(true));
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('ice-candidate', e.candidate);
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') {
        if (remoteVideoRef.current?.paused && remoteVideoRef.current?.srcObject)
          remoteVideoRef.current.play().catch(() => setRequiresPlay(true));
      } else if (s === 'failed') {
        if (!relay) startWebRTC(initiator, true);
        else handleCleanup(false);
      } else if (s === 'disconnected' || s === 'closed') {
        handleCleanup(false); // Only message handled by socket event
      }
    };

    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    if (initiator) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      setTimeout(() => sock.emit('offer', offer), 100);
    }
  }, [cleanupPeer, handleCleanup]);

  useEffect(() => {
    const guestId = getGuestId();
    const sock = io(SOCKET_URL, {
      auth: { guestId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = sock;

    sock.on('connect', () => setSocketStatus('connected'));
    sock.on('connect_error', () => setSocketStatus('error'));
    sock.on('disconnect', () => setSocketStatus('connecting'));
    sock.on('onlineCount', setOnlineCount);

    sock.on('matched', ({ partner: p, initiator }) => {
      partnerRef.current = p;
      setPartner(p);
      setIsMatching(false);
      setMessages([{ text: 'Connected to a stranger!', isSystem: true }]);
      startWebRTC(initiator);
    });

    sock.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    sock.on('partnerDisconnected', () => handleCleanup(true));
    sock.on('sessionEnded', ({ reason }) => {
      setMessages(p => [...p, { text: reason === 'partner_skipped' ? 'Stranger skipped.' : 'Session ended.', isSystem: true }]);
      handleCleanup(false);
    });

    initMedia();

    return () => {
      sock.disconnect();
      cleanupPeer();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  const startChat = useCallback(() => {
    if (!isMediaReady || !socketRef.current?.connected) return;
    handleCleanup(false);
    setIsMatching(true);
    setMessages([]);
    socketRef.current.emit('joinQueue', { id: getGuestId(), role: 'guest' });
  }, [handleCleanup, isMediaReady]);

  const skipChat = useCallback(() => {
    socketRef.current?.emit('skip');
    handleCleanup(false);
    setTimeout(() => {
      setIsMatching(true);
      socketRef.current?.emit('joinQueue', { id: getGuestId(), role: 'guest' });
    }, 200);
  }, [handleCleanup]);

  const sendMessage = useCallback((e) => {
    e?.preventDefault();
    if (!inputText.trim() || !partnerRef.current) return;
    setMessages(p => [...p, { text: inputText, sender: 'me' }]);
    socketRef.current?.emit('sendMessage', inputText);
    setInputText('');
  }, [inputText]);

  const toggleCamera = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setIsCameraOn(t.enabled);
  };

  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setIsMicOn(t.enabled);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // PiP Drag
  const onPipPointerDown = (e) => {
    e.preventDefault();
    const rect = pipRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  };
  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const vw = window.innerWidth, vh = window.innerHeight;
      const pw = pipRef.current?.offsetWidth || 100, ph = pipRef.current?.offsetHeight || 140;
      setPipPos({
        x: Math.max(8, Math.min(cx - dragOffset.current.x, vw - pw - 8)),
        y: Math.max(8, Math.min(cy - dragOffset.current.y, vh - ph - 80)),
      });
    };
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [isDragging]);

  const pipStyle = pipPos.x !== null ? { left: pipPos.x, top: pipPos.y, right: 'auto', bottom: 'auto' } : { right: 16, top: 70 };

  // Swipe logic
  const touchStartRef = useRef(null);
  const handleTouchStart = (e) => { touchStartRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const distance = touchStartRef.current - e.changedTouches[0].clientX;
    if (distance > 60 && (partner || isMatching)) skipChat();
    touchStartRef.current = null;
  };

  return (
    <div className="tiktok-layout" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      
      {/* 1. DOMINANT FULLSCREEN VIDEO */}
      <video
        ref={remoteVideoRef}
        autoPlay playsInline
        className={`remote-video-fullscreen ${partner ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Manual play overlay */}
      {requiresPlay && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4">
          <p className="text-white font-bold">Tap to enable audio/video</p>
          <button className="tt-btn-primary px-8 py-3" onClick={() => {
            remoteVideoRef.current?.play().catch(() => {});
            setRequiresPlay(false);
          }}>▶ Play</button>
        </div>
      )}

      {/* 2. MATCHING / IDLE SCREEN (Shows when no partner) */}
      {!partner && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
          {isMatching ? (
            <div className="flex flex-col items-center gap-6">
              <div className="tt-radar">
                <div className="tt-radar-ring" />
                <div className="tt-radar-ring delay-1" />
                <div className="tt-radar-center">📡</div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white/90">Finding someone...</h2>
              <p className="text-white/50 text-sm">{onlineCount} online globally</p>
              <button className="tt-btn-glass mt-4 px-6 py-2" onClick={() => { socketRef.current?.emit('endSession'); handleCleanup(false); }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 text-center px-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600/40 to-blue-500/40 flex items-center justify-center text-4xl border border-white/10 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                {mediaError ? '⚠️' : '👤'}
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Ready?</h1>
              <p className="text-white/60 text-sm max-w-xs">
                {mediaError || "Swipe left to skip. Be respectful. Have fun."}
              </p>
              <button 
                className="tt-btn-primary mt-4 w-full max-w-[240px] py-4 text-lg"
                onClick={startChat}
                disabled={!isMediaReady || socketStatus !== 'connected'}
              >
                {!isMediaReady ? 'Initializing...' : socketStatus !== 'connected' ? 'Connecting...' : 'Tap to Start'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. TOP OVERLAY BAR */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pt-[calc(16px+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          {partner && (
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-white/90">LIVE</span>
            </div>
          )}
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-white/70">
            👁 {onlineCount}
          </div>
        </div>
        <button onClick={() => { socketRef.current?.disconnect(); router.push('/'); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white/80 hover:bg-white/20 transition-colors">
          ✕
        </button>
      </div>

      {/* 4. DRAGGABLE SELF PIP */}
      <div
        ref={pipRef}
        className="absolute z-30 w-[100px] h-[140px] sm:w-[130px] sm:h-[180px] rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/50"
        style={{ ...pipStyle, cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={onPipPointerDown}
        onTouchStart={(e) => onPipPointerDown(e.touches[0])}
      >
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        {!isCameraOn && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-2xl">📷</div>}
      </div>

      {/* 5. TIKTOK STYLE OVERLAID CHAT */}
      <div className="absolute bottom-[80px] left-4 right-[70px] max-h-[40vh] z-20 flex flex-col justify-end pointer-events-none">
        <div className="overflow-y-auto w-full flex flex-col gap-2 no-scrollbar pb-2 pointer-events-auto" style={{ maskImage: 'linear-gradient(to top, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 80%, transparent 100%)' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              {msg.isSystem ? (
                <span className="px-3 py-1 text-xs font-semibold text-white/70 bg-black/40 backdrop-blur-sm rounded-full">
                  {msg.text}
                </span>
              ) : (
                <span className={`px-4 py-2 text-sm max-w-[85%] break-words rounded-2xl ${msg.sender === 'me' ? 'bg-indigo-600/90 text-white rounded-br-sm' : 'bg-black/50 backdrop-blur-md text-white rounded-bl-sm border border-white/10'}`}>
                  {msg.text}
                </span>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* 6. RIGHT SIDE VERTICAL ACTION CONTROLS */}
      <div className="absolute bottom-[90px] right-4 z-30 flex flex-col gap-4">
        {partner && (
          <>
            <button className="tt-icon-btn bg-red-500/20 text-red-500 border-red-500/30" onClick={() => { alert("Reported."); skipChat(); }}>
              🚩
            </button>
            <button className={`tt-icon-btn ${!isCameraOn ? 'text-red-400' : ''}`} onClick={toggleCamera}>
              {isCameraOn ? '📷' : '🚫'}
            </button>
            <button className={`tt-icon-btn ${!isMicOn ? 'text-red-400' : ''}`} onClick={toggleMic}>
              {isMicOn ? '🎤' : '🔇'}
            </button>
          </>
        )}
        <button className="tt-icon-btn bg-white/20 hover:bg-white/30 backdrop-blur-lg scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]" onClick={partner || isMatching ? skipChat : startChat} disabled={!isMediaReady}>
          {partner || isMatching ? '⏭' : '▶'}
        </button>
      </div>

      {/* 7. BOTTOM CHAT INPUT BAR */}
      <form onSubmit={sendMessage} className="absolute bottom-0 left-0 right-0 z-30 p-4 pt-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex gap-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <input
          className="flex-1 bg-black/50 backdrop-blur-md border border-white/10 text-white text-sm rounded-full px-5 py-3 outline-none placeholder:text-white/40 focus:border-indigo-500/50 transition-colors"
          placeholder={partner ? "Say something..." : "Connect to chat"}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={!partner}
        />
        <button type="submit" disabled={!partner || !inputText.trim()} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-600 rounded-full text-white opacity-90 hover:opacity-100 disabled:opacity-30 transition-opacity">
          ➤
        </button>
      </form>
    </div>
  );
}
