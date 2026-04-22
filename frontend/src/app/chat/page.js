'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Mic, MicOff, MessageSquare, ShieldAlert, SkipForward, FlipHorizontal, X, Send } from 'lucide-react';

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
  const [chatOpen, setChatOpen] = useState(false);
  
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

  // Switch Camera logic
  const [facingMode, setFacingMode] = useState('user');

  useEffect(() => {
    document.body.classList.add('chat-body');
    document.body.classList.remove('landing-body');
    return () => document.body.classList.remove('chat-body');
  }, []);

  const initMedia = useCallback(async (mode = 'user') => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode }, 
        audio: true 
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      // Update WebRTC senders if already connected
      if (peerRef.current) {
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        const senders = peerRef.current.getSenders();
        
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender && videoTrack) videoSender.replaceTrack(videoTrack);
        
        const audioSender = senders.find(s => s.track?.kind === 'audio');
        if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack);
      }

      setIsMediaReady(true);
      setMediaError(null);
      setIsCameraOn(true);
      setIsMicOn(true);
      return stream;
    } catch (err) {
      setMediaError('Camera/mic access denied.');
      setIsMediaReady(true);
      return null;
    }
  }, []);

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    initMedia(newMode);
  };

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
        // Autoplay seamlessly
        remoteVideoRef.current.play().catch(console.warn);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('ice-candidate', e.candidate);
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') {
        if (remoteVideoRef.current?.paused && remoteVideoRef.current?.srcObject)
          remoteVideoRef.current.play().catch(console.warn);
      } else if (s === 'failed') {
        if (!relay) startWebRTC(initiator, true);
        else handleCleanup(false);
      } else if (s === 'disconnected' || s === 'closed') {
        handleCleanup(false);
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
      // If chat is closed, maybe we want to notify or auto-open? Let's leave it hidden by default.
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
    if (!pipRef.current) return;
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
        y: Math.max(8, Math.min(cy - dragOffset.current.y, vh - ph - 100)), // buffer for bottom dock
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

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden flex flex-col">
      
      {/* 1. DOMINANT FULLSCREEN VIDEO */}
      <video
        ref={remoteVideoRef}
        autoPlay playsInline
        className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${partner ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* 2. MATCHING / IDLE SCREEN (Shows when no partner) */}
      <AnimatePresence>
        {!partner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md"
          >
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
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#0f172a] flex items-center justify-center border border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
                  {mediaError ? <ShieldAlert className="w-10 h-10 text-red-400" /> : <Video className="w-10 h-10 text-white" />}
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Ready?</h1>
                <p className="text-white/60 text-sm max-w-xs">
                  {mediaError || "Connect instantly. Be respectful. Have fun."}
                </p>
                <button 
                  className="tt-btn-primary mt-4 w-full max-w-[240px] py-4 text-lg bg-white text-[#0f172a] hover:bg-slate-100"
                  onClick={startChat}
                  disabled={!isMediaReady || socketStatus !== 'connected'}
                >
                  {!isMediaReady ? 'Initializing...' : socketStatus !== 'connected' ? 'Connecting...' : 'Tap to Start'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. TOP OVERLAY BAR */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pt-[calc(16px+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          {partner && (
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-white/90 tracking-wide">LIVE</span>
            </div>
          )}
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-white/70">
            👁 {onlineCount}
          </div>
        </div>
        <button onClick={() => { socketRef.current?.disconnect(); router.push('/'); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white/80 hover:bg-white/20 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 4. DRAGGABLE SELF PIP */}
      <motion.div
        ref={pipRef}
        className="absolute z-30 w-[100px] h-[140px] sm:w-[130px] sm:h-[180px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/50"
        style={{ ...pipStyle, cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={onPipPointerDown}
        onTouchStart={(e) => onPipPointerDown(e.touches[0])}
      >
        <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
        {!isCameraOn && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900"><CameraOff className="text-white/50 w-8 h-8"/></div>}
      </motion.div>

      {/* 5. COLLAPSIBLE CHAT DRAWER */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="absolute bottom-[90px] left-4 right-4 sm:left-auto sm:w-[350px] sm:right-4 z-40 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col h-[50vh] sm:h-[60vh] max-h-[500px]"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <span className="font-bold text-[#0f172a] flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[#3b82f6]"/> Live Chat</span>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
              {messages.length === 0 && (
                <p className="text-center text-slate-400 text-sm mt-10">Say hi to the stranger!</p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  {msg.isSystem ? (
                    <div className="w-full text-center">
                      <span className="px-3 py-1 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full uppercase tracking-wider">
                        {msg.text}
                      </span>
                    </div>
                  ) : (
                    <span className={`px-4 py-2 text-[15px] max-w-[85%] break-words shadow-sm ${msg.sender === 'me' ? 'bg-[#3b82f6] text-white rounded-2xl rounded-tr-sm' : 'bg-slate-100 text-[#0f172a] rounded-2xl rounded-tl-sm'}`}>
                      {msg.text}
                    </span>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input
                className="flex-1 bg-slate-100 border-none text-[#0f172a] text-[15px] rounded-full px-5 py-3 outline-none placeholder:text-slate-400"
                placeholder={partner ? "Say something..." : "Waiting..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={!partner}
              />
              <button type="submit" disabled={!partner || !inputText.trim()} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[#0f172a] rounded-full text-white opacity-100 disabled:opacity-30 transition-opacity">
                <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. BOTTOM FLOATING DOCK */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-[calc(20px+env(safe-area-inset-bottom))] pt-10 px-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center pointer-events-none">
        <div className="glass p-2 rounded-full flex items-center gap-2 pointer-events-auto shadow-2xl border border-white/20">
          
          <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={toggleMic}>
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-red-400" />}
          </button>
          
          <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={toggleCamera}>
            {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5 text-red-400" />}
          </button>
          
          <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={switchCamera}>
            <FlipHorizontal className="w-5 h-5" />
          </button>
          
          <button className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors relative ${chatOpen ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} onClick={() => setChatOpen(!chatOpen)}>
            <MessageSquare className="w-5 h-5" />
            {!chatOpen && messages.filter(m => !m.isSystem && m.sender !== 'me').length > 0 && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-transparent" />
            )}
          </button>

          {partner && (
            <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center text-white hover:text-red-400 transition-colors" onClick={() => { alert("Reported."); skipChat(); }}>
              <ShieldAlert className="w-5 h-5" />
            </button>
          )}

          <button className="ml-2 w-14 h-14 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#60a5fa] hover:brightness-110 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 transition-all" onClick={partner || isMatching ? skipChat : startChat} disabled={!isMediaReady}>
            {partner || isMatching ? <SkipForward className="w-6 h-6 fill-current" /> : <Video className="w-6 h-6 fill-current" />}
          </button>

        </div>
      </div>
    </div>
  );
}
