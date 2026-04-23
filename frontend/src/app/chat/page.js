'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Mic, MicOff, MessageSquare, ShieldAlert, SkipForward, X, Send, Video, PhoneOff, Columns, Sparkles, Eye, Wifi } from 'lucide-react';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const FILTERS = [
  { name: 'Normal', value: 'none' },
  { name: 'Beauty', value: 'contrast(1.05) brightness(1.05) blur(0.5px)' },
  { name: 'Warm', value: 'sepia(0.3) saturate(1.2) contrast(1.1) hue-rotate(-10deg)' },
  { name: 'Cool', value: 'saturate(1.2) contrast(1.1) hue-rotate(10deg)' },
  { name: 'B&W', value: 'grayscale(1) contrast(1.2)' },
  { name: 'Cinematic', value: 'contrast(1.2) saturate(1.1) brightness(0.9)' }
];

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
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [pipPos, setPipPos] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const rawStreamRef = useRef(null);
  const rawVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const activeFilterRef = useRef(FILTERS[0]);
  const animationRef = useRef(null);

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
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  useEffect(() => {
    document.body.classList.add('chat-body');
    document.body.classList.remove('landing-body');
    return () => document.body.classList.remove('chat-body');
  }, []);

  const initMedia = useCallback(async () => {
    try {
      if (rawStreamRef.current) {
        rawStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      rawStreamRef.current = stream;

      if (!rawVideoRef.current) {
        rawVideoRef.current = document.createElement('video');
        rawVideoRef.current.muted = true;
        rawVideoRef.current.playsInline = true;
      }
      rawVideoRef.current.srcObject = stream;
      await rawVideoRef.current.play().catch(() => {});

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false });

      const drawFrame = () => {
        if (rawVideoRef.current && rawVideoRef.current.videoWidth > 0) {
          if (canvas.width !== rawVideoRef.current.videoWidth) {
            canvas.width = rawVideoRef.current.videoWidth;
            canvas.height = rawVideoRef.current.videoHeight;
          }
          ctx.filter = activeFilterRef.current.value;
          ctx.drawImage(rawVideoRef.current, 0, 0, canvas.width, canvas.height);
        }
        animationRef.current = requestAnimationFrame(drawFrame);
      };

      cancelAnimationFrame(animationRef.current);
      drawFrame();

      const canvasStream = canvas.captureStream(30);
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) canvasStream.addTrack(audioTrack);

      localStreamRef.current = canvasStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = canvasStream;
      
      // Update WebRTC senders if already connected
      if (peerRef.current) {
        const videoTrack = canvasStream.getVideoTracks()[0];
        const audioTrack = canvasStream.getAudioTracks()[0];
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
      return canvasStream;
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
  }, [cleanupPeer]);

  const endCall = useCallback(() => {
    socketRef.current?.disconnect();
    cleanupPeer();
    rawStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(animationRef.current);
    router.push('/');
  }, [cleanupPeer, router]);

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
      rawStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animationRef.current);
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
    const t = rawStreamRef.current?.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setIsCameraOn(t.enabled);
  };

  const toggleMic = () => {
    const t = rawStreamRef.current?.getAudioTracks()[0];
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
      
      {/* 1. DOMINANT FULLSCREEN VIDEO OR SPLIT SCREEN */}
      <motion.div
        layout
        className={isSplitScreen 
          ? "absolute top-0 left-0 w-full h-1/2 md:w-1/2 md:h-full z-0 overflow-hidden bg-black border-b md:border-b-0 md:border-r border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          : "absolute inset-0 z-0 overflow-hidden"
        }
      >
        <video
          ref={remoteVideoRef}
          autoPlay playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${partner ? 'opacity-100' : 'opacity-0'}`}
        />
      </motion.div>

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
                  <div className="tt-radar-center"><Wifi className="w-5 h-5 text-white/80" /></div>
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
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-white/70">
            <Eye className="w-3.5 h-3.5" /> {onlineCount}
          </div>
        </div>
        <button onClick={() => { socketRef.current?.disconnect(); router.push('/'); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white/80 hover:bg-white/20 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 4. DRAGGABLE SELF PIP OR SPLIT SCREEN */}
      <motion.div
        ref={pipRef}
        layout
        className={isSplitScreen 
          ? "absolute bottom-0 left-0 w-full h-1/2 md:top-0 md:left-1/2 md:w-1/2 md:h-full z-0 overflow-hidden bg-black" 
          : "absolute z-30 w-[100px] h-[140px] sm:w-[130px] sm:h-[180px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/50"
        }
        style={!isSplitScreen ? { ...pipStyle, cursor: isDragging ? 'grabbing' : 'grab' } : {}}
        onMouseDown={!isSplitScreen ? onPipPointerDown : undefined}
        onTouchStart={!isSplitScreen ? (e) => onPipPointerDown(e.touches[0]) : undefined}
      >
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
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

      {/* 6. FILTER PANEL AND DOCK */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            className="absolute bottom-[100px] sm:bottom-[110px] left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] z-40 bg-gradient-to-b from-white/10 to-black/60 backdrop-blur-3xl rounded-[28px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] p-3 flex flex-col gap-2"
          >
            <div className="flex justify-between items-center px-2 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-white/90 font-medium text-sm tracking-wide">Video Filters</span>
              </div>
              <button onClick={() => setShowFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-2 px-2 snap-x">
              {FILTERS.map(f => {
                const isActive = activeFilter.name === f.name;
                return (
                  <motion.button
                    key={f.name}
                    onClick={() => setActiveFilter(f)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-shrink-0 relative group snap-center flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-400/50' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 backdrop-blur-md'}`}
                  >
                    {isActive && <Sparkles className="w-3.5 h-3.5" />}
                    {f.name}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 z-30 pb-[calc(20px+env(safe-area-inset-bottom))] pt-10 px-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center pointer-events-none">
        <div className="glass p-2 rounded-full flex items-center gap-2 pointer-events-auto shadow-2xl border border-white/20">
          
          {/* LEFT SIDE */}
          <button className={`w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-colors relative ${isSplitScreen ? 'bg-white/30 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} onClick={() => setIsSplitScreen(!isSplitScreen)}>
            <Columns className="w-5 h-5" />
          </button>

          <button className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-white/10 hover:bg-yellow-500/20 flex items-center justify-center text-white hover:text-yellow-400 transition-colors" onClick={() => { if (partner) { alert("Reported."); skipChat(); } }} disabled={!partner} style={{ opacity: partner ? 1 : 0.5 }}>
            <ShieldAlert className="w-5 h-5" />
          </button>
          
          {/* CENTER */}
          <div className="mx-2 sm:mx-4 flex items-center gap-2 sm:gap-3">
            <button className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-full bg-blue-500 hover:brightness-110 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 transition-all" onClick={partner || isMatching ? skipChat : startChat} disabled={!isMediaReady}>
              <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </button>
            
            <button className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] flex-shrink-0 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white transition-all shadow-lg shadow-red-500/40" onClick={endCall}>
              <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          </div>

          {/* RIGHT SIDE */}
          <button className={`w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-colors relative ${chatOpen ? 'bg-white/30 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} onClick={() => setChatOpen(!chatOpen)}>
            <MessageSquare className="w-5 h-5" />
            {!chatOpen && messages.filter(m => !m.isSystem && m.sender !== 'me').length > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-transparent" />
            )}
          </button>

          <button className={`w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-colors relative ${showFilters || activeFilter.value !== 'none' ? 'bg-white/30 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} onClick={() => setShowFilters(!showFilters)}>
            <Sparkles className="w-5 h-5" />
          </button>

        </div>
      </div>
    </div>
  );
}
