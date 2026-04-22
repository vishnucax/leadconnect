'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useRouter, useSearchParams } from 'next/navigation';

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

function formatTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const EMOJIS = ['😂','❤️','👍','🔥','😍','🎉','💀','🤣','😭','✨'];

export default function ChatPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mediaError, setMediaError] = useState(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [requiresPlay, setRequiresPlay] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
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
  const typingTimer = useRef(null);

  // ── Set body class ──────────────────────────────────────────
  useEffect(() => {
    document.body.classList.add('chat-body');
    document.body.classList.remove('landing-body');
    return () => document.body.classList.remove('chat-body');
  }, []);

  // ── Media ───────────────────────────────────────────────────
  const initMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setIsMediaReady(true);
      return stream;
    } catch (err) {
      setMediaError(err.name === 'NotAllowedError' ? 'Camera/mic access denied.' : 'No camera found.');
      setIsMediaReady(true);
      return null;
    }
  }, []);

  // ── Peer cleanup ────────────────────────────────────────────
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
      setMessages(p => [...p, { text: 'Stranger disconnected.', isSystem: true, t: Date.now() }]);
    partnerRef.current = null;
    setPartner(null);
    setIsMatching(false);
    setConnectionStatus('disconnected');
    setRequiresPlay(false);
  }, [cleanupPeer]);

  // ── WebRTC ──────────────────────────────────────────────────
  const startWebRTC = useCallback(async (initiator, relay = false) => {
    const sock = socketRef.current;
    if (!sock) return;
    cleanupPeer();
    setConnectionStatus('connecting');

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
        setConnectionStatus('connected');
        if (remoteVideoRef.current?.paused && remoteVideoRef.current?.srcObject)
          remoteVideoRef.current.play().catch(() => setRequiresPlay(true));
      } else if (s === 'failed') {
        if (!relay) startWebRTC(initiator, true);
        else { setConnectionStatus('disconnected'); handleCleanup(false); }
      } else if (s === 'disconnected' || s === 'closed') {
        setConnectionStatus('disconnected');
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

  // ── Socket ──────────────────────────────────────────────────
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
    sock.on('queueCount', () => {});

    sock.on('matched', ({ partner: p, initiator }) => {
      partnerRef.current = p;
      setPartner(p);
      setIsMatching(false);
      setMessages([{ text: '🎉 Connected! Say hi to your new stranger.', isSystem: true, t: Date.now() }]);
      startWebRTC(initiator);
    });

    sock.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, { ...msg, t: Date.now() }]);
      setIsTyping(false);
    });

    sock.on('typing', () => {
      setIsTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
    });

    sock.on('partnerDisconnected', () => handleCleanup(true));
    sock.on('sessionEnded', ({ reason }) => {
      setMessages(p => [...p, { text: reason === 'partner_skipped' ? 'Stranger skipped.' : 'Session ended.', isSystem: true, t: Date.now() }]);
      handleCleanup(false);
    });

    initMedia();

    return () => {
      sock.disconnect();
      cleanupPeer();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  // ── Chat actions ────────────────────────────────────────────
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
    }, 300);
  }, [handleCleanup]);

  const endChat = useCallback(() => {
    socketRef.current?.emit('endSession');
    handleCleanup(false);
    setMessages([{ text: 'Session ended. Start again anytime.', isSystem: true, t: Date.now() }]);
  }, [handleCleanup]);

  const sendMessage = useCallback((e) => {
    e?.preventDefault();
    if (!inputText.trim() || !partnerRef.current) return;
    setMessages(p => [...p, { text: inputText, sender: 'me', t: Date.now() }]);
    socketRef.current?.emit('sendMessage', inputText);
    setInputText('');
    setShowEmoji(false);
  }, [inputText]);

  const handleTyping = (e) => {
    setInputText(e.target.value);
    socketRef.current?.emit('typing');
  };

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

  // Auto-scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── PiP drag ────────────────────────────────────────────────
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
      const pw = pipRef.current?.offsetWidth || 110, ph = pipRef.current?.offsetHeight || 160;
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

  // ── Default PiP position ────────────────────────────────────
  const pipStyle = pipPos.x !== null
    ? { left: pipPos.x, top: pipPos.y, right: 'auto', bottom: 'auto' }
    : { right: 16, top: 80 };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="chat-app">
      {/* Remote video — full screen background */}
      <video
        ref={remoteVideoRef}
        autoPlay playsInline
        className="remote-video-bg"
        style={{ opacity: partner ? 1 : 0 }}
      />

      {/* Manual play overlay */}
      {requiresPlay && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <p style={{ color: '#fff', fontWeight: 600 }}>Tap to enable audio/video</p>
          <button className="btn-primary" onClick={() => {
            remoteVideoRef.current?.play().catch(() => {});
            setRequiresPlay(false);
          }}>▶ Enable A/V</button>
        </div>
      )}

      {/* Search / waiting overlay */}
      {!partner && (
        <div className="search-overlay">
          {isMatching ? (
            <>
              <div className="radar-wrapper">
                <div className="radar-ring" />
                <div className="radar-ring" />
                <div className="radar-ring" />
                <div className="radar-center">📡</div>
              </div>
              <p style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 20 }}>
                Finding someone…
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {onlineCount} people online right now
              </p>
              <button className="btn-secondary" style={{ marginTop: 8 }} onClick={endChat}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.15))',
                border: '2px solid rgba(139,92,246,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40, marginBottom: 8,
              }}>
                {mediaError ? '⚠️' : '👤'}
              </div>
              {mediaError && (
                <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center', maxWidth: 260, marginBottom: 8 }}>
                  {mediaError}
                </p>
              )}
              <p style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 22, textAlign: 'center' }}>
                Ready to connect?
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>
                {onlineCount > 0 ? `${onlineCount} people online` : 'Connecting to server…'}
              </p>
              <button
                className="btn-primary"
                style={{ fontSize: 16, padding: '16px 40px', marginTop: 8 }}
                onClick={startChat}
                disabled={!isMediaReady || socketStatus !== 'connected'}
              >
                {!isMediaReady ? '🔄 Initializing…' : socketStatus !== 'connected' ? '⚡ Connecting…' : '🎥 Start Video Chat'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Top bar */}
      <div className="chat-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => { socketRef.current?.disconnect(); router.push('/'); }}
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            ← Back
          </button>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            📡
          </div>
          <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 15 }}>TalkRandom</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {partner && (
            <div className={`status-pill ${connectionStatus === 'connected' ? 'status-online' : 'status-connecting'}`}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connectionStatus === 'connected' ? '#22c55e' : '#facc15' }} />
              {connectionStatus === 'connected' ? 'Connected' : 'Connecting…'}
            </div>
          )}
          <div className="status-pill" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: socketStatus === 'connected' ? '#22c55e' : '#ef4444' }} />
            {onlineCount} online
          </div>
        </div>
      </div>

      {/* Partner label */}
      {partner && (
        <div className="partner-label">Stranger 🌍</div>
      )}

      {/* PiP Self Video */}
      <div
        ref={pipRef}
        className="self-video-pip"
        style={{ ...pipStyle, cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={onPipPointerDown}
        onTouchStart={(e) => onPipPointerDown(e.touches[0])}
      >
        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        {!isCameraOn && (
          <div style={{ position: 'absolute', inset: 0, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📷</div>
        )}
      </div>

      {/* Chat Overlay */}
      <div className={`chat-overlay ${chatOpen ? 'open' : ''}`}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'rgba(0,0,0,0.3)' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>💬 Live Chat</span>
          <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
              Start chatting — messages appear here.
            </p>
          )}
          {messages.map((msg, i) => msg.isSystem ? (
            <div key={i} className="msg-bubble system">{msg.text}</div>
          ) : (
            <div key={i}>
              <div className={`msg-bubble ${msg.sender === 'me' ? 'me' : 'them'}`}>{msg.text}</div>
              <div className="msg-time" style={{ textAlign: msg.sender === 'me' ? 'right' : 'left' }}>
                {msg.t ? formatTime(msg.t) : ''}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Emoji picker */}
        {showEmoji && (
          <div style={{ padding: '8px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setInputText(p => p + e)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>{e}</button>
            ))}
          </div>
        )}

        <div className="chat-input-bar">
          <button onClick={() => setShowEmoji(p => !p)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', flexShrink: 0 }}>😊</button>
          <form onSubmit={sendMessage} style={{ flex: 1, display: 'flex', gap: 8 }}>
            <input
              className="chat-input"
              placeholder={partner ? 'Type a message…' : 'Connect first…'}
              value={inputText}
              onChange={handleTyping}
              disabled={!partner}
            />
            <button type="submit" disabled={!partner || !inputText.trim()}
              style={{
                background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
                border: 'none', borderRadius: '50%', width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, opacity: (!partner || !inputText.trim()) ? 0.4 : 1,
              }}>
              ➤
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Dock Controls */}
      <div className="bottom-dock">
        {/* Skip / Next */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button className="icon-btn next-btn" onClick={partner || isMatching ? skipChat : startChat}
            title={partner ? 'Next Stranger' : 'Start'} disabled={!isMediaReady}>
            {partner || isMatching ? '⏭' : '▶'}
          </button>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{partner || isMatching ? 'Next' : 'Start'}</span>
        </div>

        {/* Mic */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button className={`icon-btn ${!isMicOn ? 'danger' : ''}`} onClick={toggleMic}>
            {isMicOn ? '🎤' : '🔇'}
          </button>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{isMicOn ? 'Mute' : 'Unmute'}</span>
        </div>

        {/* Camera */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button className={`icon-btn ${!isCameraOn ? 'danger' : ''}`} onClick={toggleCamera}>
            {isCameraOn ? '📷' : '🚫'}
          </button>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{isCameraOn ? 'Camera' : 'Camera Off'}</span>
        </div>

        {/* Chat toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button className={`icon-btn ${chatOpen ? 'active' : ''}`} onClick={() => setChatOpen(p => !p)}
            style={{ position: 'relative' }}>
            💬
            {messages.filter(m => !m.isSystem).length > 0 && !chatOpen && (
              <div style={{
                position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                borderRadius: '50%', background: '#8b5cf6', fontSize: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
              }}>
                {messages.filter(m => !m.isSystem && m.sender !== 'me').length || ''}
              </div>
            )}
          </button>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Chat</span>
        </div>

        {/* Stop */}
        {partner && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button className="icon-btn danger" onClick={endChat}>✖</button>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Stop</span>
          </div>
        )}
      </div>
    </div>
  );
}
