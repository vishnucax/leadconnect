# LEAD Connect

**Realtime anonymous video chat, built for students.**

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P-blue?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/Status-Beta-orange?style=flat-square)

---

## Overview

LEAD Connect is a realtime stranger video chat platform originally built for students of LEAD College (Autonomous), Palakkad. It anonymously pairs students for one-on-one video and text chat sessions, enabling spontaneous connections across department boundaries.

The platform follows a peer-to-peer architecture using WebRTC for direct media streaming, with Socket.IO handling all signaling and matchmaking coordination. The frontend is designed mobile-first, with a fullscreen immersive UI that prioritizes the live video experience.

---

## Why I Built This

Within any college, students tend to stay within their departments and existing friend groups. There is rarely a low-friction way to meet someone outside your circle without a formal event or shared class.

LEAD Connect was built to solve that. The goal was a platform where any two students could click a button, be instantly connected through video, and have a real conversation — with no profiles, no follow requests, no social graph to navigate. Just two people, talking.

The technical challenge of building that experience reliably — across mobile browsers, varying network conditions, and at low latency — was what made this project worth building.

---

## Key Features

- **Realtime random matching** — Students are paired instantly through a queue-based socket system
- **Peer-to-peer video calls** — Direct WebRTC streams; media does not route through the server
- **Live messaging** — In-session chat drawer that does not interrupt the video experience
- **Split-screen mode** — Side-by-side on desktop, stacked on mobile, with animated Framer Motion layout transitions
- **Lightweight video filters** — CSS canvas-based filters (Warm, Cool, B&W, Cinematic, Beauty) applied before streaming with zero WebRTC overhead
- **Mobile-first UI** — Fullscreen immersive layout with bottom safe-area handling, swipe-friendly interactions, and responsive split layouts
- **Report system** — In-session flag with automatic skip and session cleanup
- **Anonymous interaction flow** — No accounts, no persistent identity
- **Smooth transitions** — Framer Motion layout animations throughout

---

## Architecture

```
User opens chat
     │
     ▼
Socket.IO connection established
     │
     ▼
User emits joinQueue with guest ID
     │
     ▼
Server matches two users → emits "matched" event with initiator flag
     │
     ▼
Both clients initialize RTCPeerConnection
     │
     ├── Initiator creates SDP offer → sends via socket
     │
     ├── Receiver sets remote description → creates SDP answer → sends via socket
     │
     └── ICE candidates exchanged → P2P connection established
               │
               ▼
        Direct video/audio stream
        (no media relay through server)
```

### Why WebRTC

WebRTC was chosen because it moves media traffic entirely off the server once the connection is established. The socket server only handles signaling — a small, low-frequency exchange. This means the infrastructure cost does not scale with the number of active calls, only with the number of simultaneous connections trying to match.

For cases where direct P2P fails (symmetric NAT, restrictive firewalls), the system falls back automatically to a TURN relay via a separate API endpoint that provides TURN credentials. This covers the majority of real-world edge cases without requiring the server to handle media under normal conditions.

### Signaling Flow

1. `joinQueue` → server adds user to matching pool  
2. `matched` → server emits to both users with `initiator` boolean  
3. `offer` / `answer` → SDP exchanged through socket  
4. `ice-candidate` → trickled as they arrive  
5. `partnerDisconnected` / `sessionEnded` → cleanup on both sides  

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework, routing, SSR shell |
| React | Component model, state management |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Layout animations, presence transitions |
| Lucide React | Icon system |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express | HTTP layer, TURN credential API |
| Socket.IO | Signaling, matchmaking, session events |

### Realtime Layer
| Technology | Purpose |
|---|---|
| WebRTC (browser native) | Peer-to-peer audio/video |
| STUN (Google) | NAT traversal for direct connections |
| TURN (Metered.ca) | Relay fallback for restrictive networks |

### Deployment
| Layer | Platform |
|---|---|
| Frontend | Vercel |
| Backend/WebSocket | Railway / Render |

---

## Frontend Engineering

### State & Media Pipeline

The local video stream goes through an intermediate canvas pipeline before being added to the WebRTC peer connection:

```
Camera → rawStream
           │
           ▼
    Hidden <video> element (muted)
           │
           ▼
    requestAnimationFrame loop
    → ctx.filter applied (CSS filter string)
    → canvas.drawImage() each frame
           │
           ▼
    canvas.captureStream(30fps)
    → added to RTCPeerConnection
```

This means video filters are applied before the stream goes to the peer, so what the stranger sees is already filtered. The approach uses CSS-level filters — no image processing libraries, no pixel manipulation. Performance impact on low-end mobile devices is negligible.

### Layout System

The UI operates in two modes toggled at runtime:

- **Immersive mode** — Stranger video fills the viewport. Local camera renders as a small draggable PiP overlay (absolute positioned, pointer-event isolated).
- **Split-screen mode** — On desktop: 50/50 horizontal flex layout. On mobile: 50/50 vertical stack. Framer Motion's `layout` prop handles animated transitions between states.

The floating control dock uses `env(safe-area-inset-bottom)` for iPhone notch/home bar compatibility. All dock buttons are `pointer-events-auto` inside a `pointer-events-none` container to allow video interaction beneath it.

### Performance Choices

- No global state library — local `useState`/`useCallback`/`useRef` only
- `requestAnimationFrame` loop cancels on unmount via `animationRef`
- Canvas context created once with `{ willReadFrequently: false, alpha: false }` hints
- No re-renders on ICE candidate trickle — socket listeners are stable refs
- `no-scrollbar` on scrollable containers to avoid layout shifts

---

## Backend Engineering

### Matchmaking

The server maintains a simple in-memory queue. When a user emits `joinQueue`, the server checks for an existing waiting user:

- If found: both are matched, assigned to a shared room, and notified with a `matched` event. One is designated as initiator.
- If not found: user is added to the queue.

```js
// Simplified matchmaking logic
socket.on('joinQueue', (userData) => {
  if (waitingUser && waitingUser.id !== socket.id) {
    // Pair them
    const room = uuid();
    io.to(waitingUser.id).emit('matched', { partner: socket.id, initiator: true });
    io.to(socket.id).emit('matched', { partner: waitingUser.id, initiator: false });
    waitingUser = null;
  } else {
    waitingUser = socket;
  }
});
```

### Session Lifecycle

- `skip` → current session ends, user immediately re-joins queue
- `endSession` → full disconnect, no re-queue
- `disconnect` → server cleans up any waiting state or active room, notifies partner

Room state is cleaned up synchronously on disconnect. There is no persistent storage for session data — everything is in-memory and scoped to the socket lifecycle.

---

## Performance Considerations

**Bandwidth**: Under normal conditions, video/audio traffic is entirely peer-to-peer. The server handles only socket events, which are small JSON payloads (typically < 1KB). This means a server with modest specs can support a large number of concurrent matched pairs.

**Filters**: CSS `filter` strings applied via canvas `ctx.filter` are GPU-accelerated and add no meaningful CPU overhead at 30fps on modern mobile hardware.

**Mobile**: Layout transitions use Framer Motion's `layout` animation which relies on transform, not layout recalculation. The video elements use `object-cover` with fixed containers to avoid reflow during resize.

**Socket payloads**: SDP offers/answers are the largest socket payloads (~1–4KB). ICE candidates are small. Everything else in the signaling flow is a lightweight event with a minimal JSON body.

---

## Security & Moderation

- **Report system**: Any user can flag a session. Flagging triggers an immediate skip and logs the report event. Future builds will persist reports for moderation review.
- **No persistent identity**: Sessions are ephemeral. Guest IDs are generated client-side and stored in `localStorage`. There is no backend user record.
- **Moderation roadmap**: Planned integration of server-side rate limiting on queue joins to prevent abuse loops, and optional content moderation via frame sampling.
- **Privacy**: No video or audio is ever routed through the application server under normal P2P conditions. TURN relay traffic is encrypted (DTLS-SRTP).

---

## Roadmap

- [ ] **Student authentication** — Verified `.edu` email login scoped to LEAD College
- [ ] **Interest-based matching** — Optional tags (department, year, topics) to weight matchmaking
- [ ] **Session history** — Opt-in connection history with reconnect support
- [ ] **Friend system** — Send a connect request during an active session
- [ ] **Student communities** — Group video rooms for departments or clubs
- [ ] **AI moderation** — Frame sampling with NSFW detection running server-side
- [ ] **Native mobile app** — React Native with native WebRTC bindings for improved mobile performance
- [ ] **Admin dashboard** — Report queue, session analytics, abuse pattern detection

---

## Screenshots

| View | Preview |
|---|---|
| Landing Page | *(coming soon)* |
| Video Chat — Immersive | *(coming soon)* |
| Split-Screen Mode | *(coming soon)* |
| Mobile UI | *(coming soon)* |

---

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Clone

```bash
git clone https://github.com/vishnucax/leadconnect.git
cd leadconnect
```

### Backend

```bash
cd backend
npm install
```

Create `.env`:

```env
PORT=5000
TURN_SECRET=your_turn_secret       # optional, from Metered.ca
TURN_API_KEY=your_turn_api_key     # optional
```

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`. Backend at `http://localhost:5000`.

---

## Deployment

**Frontend (Vercel)**  
Connect the `frontend/` directory to a Vercel project. Set `NEXT_PUBLIC_API_URL` to your deployed backend URL in the Vercel environment variables dashboard.

**Backend (Railway / Render)**  
Deploy the `backend/` directory as a Node.js service. Ensure the platform supports persistent WebSocket connections (disable HTTP request timeout or use a platform that handles long-lived connections natively).

Socket.IO is configured to use both `websocket` and `polling` transports with automatic fallback, so it works behind most reverse proxies without additional configuration.

---

## Lessons Learned

**WebRTC is not plug-and-play on mobile browsers.** Safari on iOS handles ICE candidate timing differently from Chrome. The trickle ICE buffering approach — where candidates are queued until `setRemoteDescription` completes — was necessary to avoid race conditions that caused silent connection failures.

**Signaling state machines matter.** Calling `setRemoteDescription` in the wrong `signalingState` causes uncatchable promise rejections that break the peer connection silently. Adding state guards before every signaling operation resolved a class of intermittent bugs that were difficult to reproduce.

**TURN fallback is non-negotiable for production.** Around 10–15% of mobile connections (especially on college WiFi with symmetric NAT) will fail P2P. Without TURN, those users silently get black screens. Implementing automatic TURN retry on ICE failure was essential for real-world reliability.

**Canvas filter pipeline introduces a one-frame delay.** Because the canvas loop runs async via `requestAnimationFrame`, there is a ~16ms latency between camera input and the filtered stream going to the peer. This is imperceptible but worth noting when debugging stream synchronization issues.

**Mobile UI with live video requires careful z-index and pointer-event management.** Overlaying controls on top of a `<video>` element requires the video container to fill the viewport precisely — any scrollable parent causes touch events to bleed through in unexpected ways.

---

## Developer

**Vishnu K**  
MCA student at LEAD College (Autonomous), Palakkad.  
Interested in backend systems, realtime communication infrastructure, and cloud/DevOps engineering.

| | |
|---|---|
| GitHub | [github.com/vishnucax](https://github.com/vishnucax) |
| LinkedIn | [linkedin.com/in/vishnu-k-7-](https://linkedin.com/in/vishnu-k-7-) |
| Portfolio | [vishnucax.github.io](https://vishnucax.github.io) |

---

<sub>LEAD Connect is an independent project and is not officially affiliated with LEAD College of Engineering & Technology, Palakkad.</sub>
