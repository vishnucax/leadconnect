'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  SkipForward,
  LogOut,
  Send,
  Flag,
  User,
  MoreVertical,
  Video,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Generate or reuse a persistent guest ID
function getGuestId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('guestId');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem('guestId', id);
  }
  return id;
}

export default function ChatPage() {
  const [socket, setSocket] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mediaError, setMediaError] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [requiresManualPlay, setRequiresManualPlay] = useState(false);

  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const partnerRef = useRef(null);

  const router = useRouter();

  // ─── Media Initialization ──────────────────────────────────────────────────
  const initMedia = useCallback(async () => {
    try {
      setMediaError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsMediaReady(true);
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      setMediaError(err.name === 'NotAllowedError'
        ? 'Camera/Mic permission denied. Please allow access and refresh.'
        : 'Could not access camera/microphone.');
      setIsMediaReady(true);
      return null;
    }
  }, []);

  // ─── Cleanup Peer Connection ───────────────────────────────────────────────
  const cleanupPeer = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // ─── Handle Cleanup After Session Ends ────────────────────────────────────
  const handleCleanup = useCallback((showMessage = true) => {
    cleanupPeer();
    if (showMessage && partnerRef.current) {
      setMessages(prev => [...prev, { text: 'Partner disconnected.', isSystem: true }]);
    }
    partnerRef.current = null;
    setPartner(null);
    setIsMatching(false);
    setConnectionStatus('disconnected');
    setRequiresManualPlay(false);
  }, [cleanupPeer]);

  // ─── WebRTC Signaling ──────────────────────────────────────────────────────
  const initiateWebRTC = useCallback(async (isInitiator, forceRelay = false) => {
    const sock = socketRef.current;
    if (!sock) return;

    if (peerConnectionRef.current) {
      cleanupPeer();
    }
    
    setConnectionStatus('connecting');
    setRequiresManualPlay(false);

    // Try to fetch TURN credentials (no auth required now)
    let iceConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    try {
      const res = await fetch(`${SOCKET_URL}/api/turn`);
      if (res.ok) {
        iceConfig = await res.json();
        console.log('WebRTC: Fetched TURN credentials successfully.');
      }
    } catch (err) {
      console.warn('WebRTC: Failed to fetch TURN credentials. Using fallback STUN.', err);
    }

    if (forceRelay) {
      console.warn('WebRTC: Forcing ICE Transport Policy to Relay.');
      iceConfig.iceTransportPolicy = 'relay';
    }

    const pc = new RTCPeerConnection(iceConfig);
    peerConnectionRef.current = pc;

    const handleOffer = async (offer) => {
      console.log('WebRTC: Offer received', offer.type);
      try {
        await pc.setRemoteDescription(offer);
        if (pendingCandidatesRef.current.length > 0) {
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(c).catch(e => console.error('WebRTC: Error adding pending candidate', e));
          }
          pendingCandidatesRef.current = [];
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock.emit('answer', answer);
      } catch (err) {
        console.error('WebRTC: Error handling offer:', err);
      }
    };

    const handleAnswer = async (answer) => {
      console.log('WebRTC: Answer received', answer.type);
      try {
        if (pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(answer);
        if (pendingCandidatesRef.current.length > 0) {
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(c).catch(e => console.error('WebRTC: Error adding pending candidate', e));
          }
          pendingCandidatesRef.current = [];
        }
      } catch (err) {
        console.error('WebRTC: Error handling answer:', err);
      }
    };

    const handleIceCandidate = async (candidate) => {
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.error('WebRTC: Error adding ICE candidate:', err);
      }
    };

    sock.off('offer').on('offer', handleOffer);
    sock.off('answer').on('answer', handleAnswer);
    sock.off('ice-candidate').on('ice-candidate', handleIceCandidate);

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setRequiresManualPlay(false))
            .catch(e => {
              if (e.name === 'NotAllowedError') setRequiresManualPlay(true);
            });
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC: ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
        if (remoteVideoRef.current && remoteVideoRef.current.paused && remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.play().catch(() => setRequiresManualPlay(true));
        }
      } else if (pc.iceConnectionState === 'failed') {
        if (!forceRelay) {
          initiateWebRTC(isInitiator, true);
        } else {
          setConnectionStatus('disconnected');
          setMessages(prev => [...prev, { text: 'Connection failed due to network restrictions.', isSystem: true }]);
          handleCleanup(false);
        }
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        setConnectionStatus('disconnected');
      }
    };

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    if (isInitiator) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        setTimeout(() => sock.emit('offer', offer), 100);
      } catch (err) {
        console.error('WebRTC: Error creating offer:', err);
      }
    }
  }, [cleanupPeer]);

  // ─── Socket Initialization ─────────────────────────────────────────────────
  useEffect(() => {
    const guestId = getGuestId();

    const newSocket = io(SOCKET_URL, {
      auth: { guestId },   // no JWT — just a persistent guest ID
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setSocketStatus('connected');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setSocketStatus('error');
    });

    newSocket.on('disconnect', () => setSocketStatus('connecting'));
    newSocket.on('onlineCount', (count) => setOnlineCount(count));
    newSocket.on('queueCount', (count) => setQueueCount(count));

    newSocket.on('matched', ({ partner: partnerData, sessionId, initiator }) => {
      console.log('Matched! initiator:', initiator);
      partnerRef.current = partnerData;
      setPartner(partnerData);
      setIsMatching(false);
      setMessages([{ text: 'You are now connected with a random student. Say hi! 👋', isSystem: true }]);
      initiateWebRTC(initiator);
    });

    newSocket.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('partnerDisconnected', () => handleCleanup(true));

    newSocket.on('sessionEnded', ({ reason }) => {
      const text = reason === 'partner_skipped' ? 'Partner skipped.' : 'Session ended.';
      setMessages(prev => [...prev, { text, isSystem: true }]);
      handleCleanup(false);
    });

    initMedia();

    return () => {
      newSocket.off('matched');
      newSocket.off('receiveMessage');
      newSocket.off('partnerDisconnected');
      newSocket.off('sessionEnded');
      newSocket.off('offer');
      newSocket.off('answer');
      newSocket.off('ice-candidate');
      newSocket.disconnect();
      cleanupPeer();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Chat Actions ──────────────────────────────────────────────────────────
  const startChat = useCallback(() => {
    if (!isMediaReady) return;
    const sock = socketRef.current;
    if (!sock || !sock.connected) return;
    handleCleanup(false);
    setIsMatching(true);
    setMessages([]);
    sock.emit('joinQueue', { id: getGuestId(), role: 'guest' });
  }, [handleCleanup, isMediaReady]);

  const skipChat = useCallback(() => {
    const sock = socketRef.current;
    if (!sock) return;
    sock.emit('skip');
    handleCleanup(false);
    setTimeout(() => {
      setIsMatching(true);
      sock.emit('joinQueue', { id: getGuestId(), role: 'guest' });
    }, 300);
  }, [handleCleanup]);

  const endChat = useCallback(() => {
    const sock = socketRef.current;
    if (sock) sock.emit('endSession');
    handleCleanup(false);
    setMessages([{ text: 'Session ended. Start a new chat anytime.', isSystem: true }]);
  }, [handleCleanup]);

  const sendMessage = useCallback((e) => {
    e.preventDefault();
    if (!inputText.trim() || !partnerRef.current) return;
    const msg = { text: inputText, sender: 'me', timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    socketRef.current?.emit('sendMessage', inputText);
    setInputText('');
  }, [inputText]);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCameraOn(track.enabled);
  }, []);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="chat-page">

      {/* Header */}
      <header className="px-6 py-4 glass border-b border-white/5 flex justify-between items-center z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Video className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold">CampusConnect</h1>
        </div>

        <div className="flex items-center gap-3">
          {socketStatus === 'error' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-400">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Server Offline
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-indigo-300">
            <div className={`w-1.5 h-1.5 rounded-full ${socketStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            {onlineCount} Online
          </div>
          {isMatching && (
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-400">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
              {queueCount} In Queue
            </div>
          )}
          {partner && (
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm border ${
              connectionStatus === 'connected'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            }`}>
              {connectionStatus === 'connected'
                ? <><Wifi className="w-3.5 h-3.5" /> Connected</>
                : <><WifiOff className="w-3.5 h-3.5" /> Connecting…</>
              }
            </div>
          )}
          <button
            onClick={() => {
              if (socketRef.current) socketRef.current.disconnect();
              if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
              router.push('/');
            }}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            title="Leave"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Media Error Banner */}
      {mediaError && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm text-center flex-shrink-0">
          ⚠️ {mediaError}
        </div>
      )}

      {/* Main Body */}
      <div className="chat-body">
        {/* Video + Controls */}
        <div className="video-section">
          <div className="video-grid">

            {/* Remote Video */}
            <div className="video-container bg-black/40 flex items-center justify-center relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ display: partner ? 'block' : 'none' }}
              />
              {requiresManualPlay && (
                <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center flex-col gap-4">
                  <p className="text-white font-medium">Browser blocked autoplay</p>
                  <button
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                    onClick={() => {
                      if (remoteVideoRef.current) remoteVideoRef.current.play().catch(() => {});
                      setRequiresManualPlay(false);
                    }}
                  >
                    Tap to Enable A/V
                  </button>
                </div>
              )}
              {!partner && (
                <div className="text-center absolute inset-0 flex items-center justify-center">
                  {isMatching ? (
                    <div className="space-y-4">
                      <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                      <p className="text-gray-400 animate-pulse">Finding someone…</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <User className="w-20 h-20 text-white/5 mx-auto" />
                      <button
                        onClick={startChat}
                        className="btn-primary"
                        disabled={!isMediaReady}
                      >
                        {isMediaReady ? 'Start Chat' : 'Initializing…'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {partner && (
                <div className="absolute bottom-4 left-4 px-4 py-2 glass rounded-2xl text-sm font-medium z-10">
                  Stranger
                </div>
              )}
            </div>

            {/* Local Video */}
            <div className="video-container bg-black/40 relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover grayscale-[0.2]"
              />
              <div className="absolute bottom-4 left-4 px-4 py-2 glass rounded-2xl text-sm font-medium">
                You
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-2xl glass transition-colors ${!isCameraOn ? 'text-red-500 bg-red-500/10' : 'hover:bg-white/10'}`}
                >
                  {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-2xl glass transition-colors ${!isMicOn ? 'text-red-500 bg-red-500/10' : 'hover:bg-white/10'}`}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="controls-bar">
            <button
              onClick={skipChat}
              disabled={!partner && !isMatching}
              className="glass px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/10 transition-all text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-5 h-5" /> SKIP
            </button>
            <button
              onClick={endChat}
              disabled={!partner}
              className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-3 rounded-2xl font-bold hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              STOP
            </button>
            <button
              className="glass p-3 rounded-2xl text-gray-400 hover:text-red-400 transition-colors"
              title="Report user"
            >
              <Flag className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="chat-panel glass-dark">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 flex-shrink-0">
            <h3 className="font-bold">Live Chat</h3>
            <button className="text-gray-500 hover:text-white">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 text-sm mt-8">
                Start a chat and messages will appear here.
              </div>
            )}
            {messages.map((msg, i) =>
              msg.isSystem ? (
                <div key={i} className="text-center py-2">
                  <span className="text-xs text-gray-500 px-3 py-1 rounded-full bg-white/5">
                    {msg.text}
                  </span>
                </div>
              ) : (
                <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.sender === 'me'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'glass text-gray-200 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              )
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 bg-white/5 border-t border-white/5 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder={partner ? 'Type a message…' : 'Connect with someone first…'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={!partner}
                className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 pl-4 pr-12 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!partner || !inputText.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-colors disabled:opacity-30"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
