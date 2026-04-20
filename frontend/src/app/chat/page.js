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

// Removed hardcoded ICE_SERVERS to fetch securely from backend

export default function ChatPage() {
  const [socket, setSocket] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
  const [mediaError, setMediaError] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'
  const [isMediaReady, setIsMediaReady] = useState(false);

  // Use refs for values that shouldn't trigger re-renders but must always be current
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const partnerRef = useRef(null); // track partner in ref too to avoid stale closures

  const router = useRouter();

  // ─── Media Initialization ───────────────────────────────────────────────────
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

  // ─── Cleanup Peer Connection ─────────────────────────────────────────────────
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

  // ─── Handle Cleanup After Session Ends ──────────────────────────────────────
  const handleCleanup = useCallback((showMessage = true) => {
    cleanupPeer();
    if (showMessage && partnerRef.current) {
      setMessages(prev => [...prev, { text: 'Partner disconnected.', isSystem: true }]);
    }
    partnerRef.current = null;
    setPartner(null);
    setIsMatching(false);
    setConnectionStatus('disconnected');
  }, [cleanupPeer]);

  // ─── WebRTC Signaling ────────────────────────────────────────────────────────
  const initiateWebRTC = useCallback(async (isInitiator) => {
    const sock = socketRef.current;
    if (!sock) return;

    cleanupPeer();
    setConnectionStatus('connecting');

    let iceConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${SOCKET_URL}/api/turn`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        iceConfig = await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch turn credentials. Using fallback STUN.');
    }

    const pc = new RTCPeerConnection(iceConfig);
    peerConnectionRef.current = pc;

    // ── Signaling handlers ──
    const handleOffer = async (offer) => {
      console.log('WebRTC: Offer received', offer.type);
      try {
        await pc.setRemoteDescription(offer);
        console.log('WebRTC: Remote description set (Offer)');
        
        // Flush pending ICE candidates
        console.log(`WebRTC: Flushing ${pendingCandidatesRef.current.length} pending candidates`);
        for (const c of pendingCandidatesRef.current) {
          await pc.addIceCandidate(c).catch(e => console.error('WebRTC: Error adding pending candidate', e));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('WebRTC: Answer created and local description set');
        sock.emit('answer', answer);
      } catch (err) {
        console.error('WebRTC: Error handling offer:', err);
      }
    };

    const handleAnswer = async (answer) => {
      console.log('WebRTC: Answer received', answer.type);
      try {
        if (pc.signalingState !== 'have-local-offer') {
          console.warn('WebRTC: Received answer but signaling state is:', pc.signalingState);
          return;
        }
        await pc.setRemoteDescription(answer);
        console.log('WebRTC: Remote description set (Answer)');
        
        // Flush pending ICE candidates
        for (const c of pendingCandidatesRef.current) {
          await pc.addIceCandidate(c).catch(e => console.error('WebRTC: Error adding pending candidate', e));
        }
        pendingCandidatesRef.current = [];
      } catch (err) {
        console.error('WebRTC: Error handling answer:', err);
      }
    };

    const handleIceCandidate = async (candidate) => {
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          console.log('WebRTC: Adding ICE candidate immediately');
          await pc.addIceCandidate(candidate);
        } else {
          console.log('WebRTC: Buffering ICE candidate');
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.error('WebRTC: Error adding ICE candidate:', err);
      }
    };

    // Remove stale listeners and add new ones
    sock.off('offer').on('offer', handleOffer);
    sock.off('answer').on('answer', handleAnswer);
    sock.off('ice-candidate').on('ice-candidate', handleIceCandidate);

    // Remote stream arrives
    pc.ontrack = (event) => {
      console.log('WebRTC: Incoming track event!', event.streams);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log('WebRTC: Attaching remote stream to video element');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => {
            console.warn('WebRTC: Remote video play failed (retrying):', e.message);
            // Fallback: try playing again on user interaction or after a small delay
            setTimeout(() => remoteVideoRef.current?.play().catch(() => {}), 1000);
          });
        }
      } else if (remoteVideoRef.current) {
        console.warn('WebRTC: No streams found in ontrack, creating one...');
        // Fallback for browsers that don't provide streams in ontrack
        if (!remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.srcObject = new MediaStream();
        }
        remoteVideoRef.current.srcObject.addTrack(event.track);
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('WebRTC: Local ICE candidate generated');
        socketRef.current.emit('ice-candidate', event.candidate);
      }
    };

    // Connection state monitoring
    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC: ICE connection state changed to:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setConnectionStatus('disconnected');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC: Peer connection state changed to:', pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('WebRTC: Signaling state changed to:', pc.signalingState);
    };

    // Initiator creates and sends the offer
    if (isInitiator) {
      try {
        console.log('WebRTC: Initiator creating offer...');
        // Add local tracks BEFORE creating offer
        const stream = localStreamRef.current;
        if (stream) {
          console.log('WebRTC: Adding local tracks to peer connection');
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
        } else {
          console.warn('WebRTC: No local stream available to add tracks');
        }

        const offer = await pc.createOffer({ 
          offerToReceiveAudio: true, 
          offerToReceiveVideo: true 
        });
        await pc.setLocalDescription(offer);
        console.log('WebRTC: Local description set (Offer)');
        
        // Small delay to ensure receiver's signaling handlers are ready
        setTimeout(() => {
          console.log('WebRTC: Sending offer to partner');
          sock.emit('offer', offer);
        }, 100);
      } catch (err) {
        console.error('WebRTC: Error creating offer:', err);
      }
    } else {
      // Receiver: Also add local tracks so initiator can see receiver
      const stream = localStreamRef.current;
      if (stream) {
        console.log('WebRTC: Receiver adding local tracks to peer connection');
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }
    }
  }, [cleanupPeer]);

  // ─── Socket Initialization ──────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
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

    newSocket.on('disconnect', () => {
      setSocketStatus('connecting');
    });

    newSocket.on('onlineCount', (count) => {
      setOnlineCount(count);
    });

    newSocket.on('queueCount', (count) => {
      setQueueCount(count);
    });

    // Session events
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

    newSocket.on('partnerDisconnected', () => {
      handleCleanup(true);
    });

    newSocket.on('sessionEnded', ({ reason }) => {
      const text = reason === 'partner_skipped' ? 'Partner skipped.' : 'Session ended.';
      setMessages(prev => [...prev, { text, isSystem: true }]);
      handleCleanup(false);
    });

    // Start media
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
      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []); // run once on mount

  // ─── Chat Actions ────────────────────────────────────────────────────────────
  const startChat = useCallback(() => {
    if (!isMediaReady) return;
    const sock = socketRef.current;
    if (!sock || !sock.connected) return;
    handleCleanup(false);
    setIsMatching(true);
    setMessages([]);
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    sock.emit('joinQueue', userData);
  }, [handleCleanup, isMediaReady]);

  const skipChat = useCallback(() => {
    const sock = socketRef.current;
    if (!sock) return;
    sock.emit('skip');
    handleCleanup(false);
    // Rejoin queue after a short delay
    setTimeout(() => {
      setIsMatching(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      sock.emit('joinQueue', userData);
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c]">

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
              {onlineCount} Users Online
            </div>
              {isMatching && (
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-400">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                  {queueCount} In Queue
                </div>
              )}
            </div>
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
              localStorage.removeItem('token');
              router.push('/');
            }}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Media Error Banner */}
      {mediaError && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm text-center">
          ⚠️ {mediaError}
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4 min-h-0">
        {/* Video + Controls */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 relative min-h-0">

            {/* Remote Video */}
            <div className="video-container bg-black/40 flex items-center justify-center relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ display: partner ? 'block' : 'none' }}
              />
              {!partner && (
                <div className="text-center absolute inset-0 flex items-center justify-center">
                  {isMatching ? (
                    <div className="space-y-4">
                      <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                      <p className="text-gray-400 animate-pulse">Finding someone special…</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <User className="w-20 h-20 text-white/5 mx-auto" />
                      <button 
                        onClick={startChat} 
                        className="btn-primary"
                        disabled={!isMediaReady}
                      >
                        {isMediaReady ? 'Start Chat' : 'Initializing Media...'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {partner && (
                <div className="absolute bottom-6 left-6 px-4 py-2 glass rounded-2xl text-sm font-medium">
                  Stranger (Student)
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
              <div className="absolute bottom-6 left-6 px-4 py-2 glass rounded-2xl text-sm font-medium">
                You
              </div>
              <div className="absolute bottom-6 right-6 flex gap-2">
                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-2xl glass transition-colors ${!isCameraOn ? 'text-red-500 bg-red-500/10' : 'hover:bg-white/10'}`}
                  title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-2xl glass transition-colors ${!isMicOn ? 'text-red-500 bg-red-500/10' : 'hover:bg-white/10'}`}
                  title={isMicOn ? 'Mute mic' : 'Unmute mic'}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-center gap-2 md:gap-4 py-2 flex-shrink-0 z-30">
            <button
              onClick={skipChat}
              disabled={!partner && !isMatching}
              className="glass px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 hover:bg-white/10 transition-all text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm md:text-base"
            >
              <SkipForward className="w-4 h-4 md:w-5 md:h-5" /> SKIP
            </button>
            <button
              onClick={endChat}
              disabled={!partner}
              className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm md:text-base"
            >
              STOP
            </button>
            <button
              className="glass p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-400 hover:text-red-400 transition-colors"
              title="Report user"
            >
              <Flag className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="w-full md:w-[380px] h-[50%] md:h-full flex flex-col glass-dark rounded-2xl md:rounded-3xl overflow-hidden border border-white/5 flex-shrink-0 z-20">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
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
