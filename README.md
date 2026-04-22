# LEAD Connect — Beta

## 1. Project Introduction

LEAD Connect is a modern realtime stranger video chat and communication platform initially created for students of LEAD College (Autonomous), Palakkad.

The platform aims to help students connect beyond department boundaries and build meaningful social interactions. Everyone starts as strangers, and LEAD Connect provides a friction-free environment for realtime communication, anonymous interaction, WebRTC video calling, and live chat. This is the foundation of our future student-focused social ecosystem vision.

---

## 2. Vision

LEAD Connect is **not** intended to remain only a stranger chat platform. 

This is the first step toward building a unique student-focused social ecosystem for LEAD College students. Future vision includes:
* **Student Communities**
* **Verified Student Ecosystem**
* **Collaboration Spaces**
* **Social Networking**
* **Campus Interaction Systems**

---

## 3. Features

### Current Features
* Random stranger matching
* Realtime video calling
* Realtime chat
* Mobile-first UI
* Responsive design
* Floating chat drawer
* Fullscreen immersive video experience
* Auto video connection
* Reporting system
* Smooth animations
* Support modal
* Cinematic loading animations

---

## 4. Tech Stack

### Frontend
* **Next.js** (App Router)
* **React 19**
* **Tailwind CSS**
* **Framer Motion**
* **Lucide React** (Icons)

### Backend
* **Node.js**
* **Socket.IO**
* **Express**

### Realtime Communication
* **WebRTC**

### Deployment
* **Vercel** (Frontend)
* **Render/Railway** (Backend Deployment Platform)

---

## 5. System Architecture

LEAD Connect operates on a modern signaling architecture:

### Frontend Flow
1. User opens application
2. Frontend initializes socket connection
3. User joins waiting queue
4. Backend finds another available user
5. Socket event exchanges peer information
6. WebRTC peer connection created
7. Video/audio streams exchanged directly
8. Realtime chat enabled

---

## 6. WebRTC Flow Explanation

### Step 1 — User Media Access
Browser asks permission for:
* Camera
* Microphone

### Step 2 — Peer Discovery
Socket.IO server helps users discover each other and signals readiness.

### Step 3 — Offer/Answer Exchange
Peers exchange:
* SDP Offers
* SDP Answers

### Step 4 — ICE Candidate Exchange
Network candidates exchanged for connection routing (STUN/TURN).

### Step 5 — Direct Peer Connection
Video/audio streams transferred peer-to-peer with zero latency.

---

## 7. Folder Structure

```bash
leadconnect/
├── frontend/
│    ├── public/
│    │    └── Assets/
│    │         └── Images/
│    ├── src/
│    │    ├── app/
│    │    │    ├── chat/
│    │    │    ├── privacy/
│    │    │    ├── globals.css
│    │    │    ├── layout.js
│    │    │    └── page.js
│    ├── tailwind.config.js
│    └── package.json
│
└── backend/
     ├── server.js
     └── package.json
```

---

## 8. Frontend Architecture

The frontend is built for absolute performance and immersion:
* **Reusable Components:** Modular UI pieces driven by Tailwind.
* **State Management:** Handled natively with React hooks (`useState`, `useEffect`, `useRef`).
* **Responsive Design Strategy:** Strict mobile-first breakpoints ensuring the video takes priority.
* **Animation Handling:** Framer Motion powers physics-based spring animations and layouts.
* **Mobile-first UI Strategy:** Bottom floating docks, touch targets over 48px, and edge-to-edge video wrapping.

---

## 9. Backend Architecture

A lightweight Node.js environment acts as the signaling hub:
* **Socket.IO Signaling Server:** Facilitates real-time event emission.
* **Matchmaking System:** A queue array pairing users based on availability.
* **Room Handling:** Dynamic UUID-based room generation for private WebRTC handshakes.
* **Connection Lifecycle:** Robust management of user connects, disconnects, and 'next' skips.
* **Disconnect Handling:** Auto-cleanup of queues and rooms upon socket drops.

---

## 10. Matching Algorithm

The matching process is designed for speed:
* User enters the waiting queue array.
* Backend checks if `waitingUsers.length >= 2`.
* Random pairing happens via `waitingUsers.pop()`.
* A unique room is created (`roomId = uuid()`).
* Both peers are pushed into the room and signaled to begin WebRTC handshakes.

---

## 11. Deployment Guide

### Frontend Deployment (Vercel)
The frontend is optimized for zero-config Vercel deployment:
* Connect GitHub repository to Vercel.
* Set root directory to `frontend`.
* Add the required environment variables.
* Deploy.

### Backend Deployment
* Deploy the Node.js `server.js` to a WebSocket-friendly host (e.g., Render, Railway, DigitalOcean).
* Set proper CORS configuration to allow the Vercel frontend domain.
* Provide necessary environment variables for TURN servers.

---

## 12. Environment Variables

Create `.env.local` (frontend) and `.env` (backend) with the following parameters:

```env
# Frontend
NEXT_PUBLIC_API_URL=https://your-backend-url.com

# Backend (Optional STUN/TURN if applicable)
PORT=4000
FRONTEND_URL=https://your-frontend-url.com
```

---

## 13. Mobile Optimization Strategy

* **Responsive Layouts:** The UI adapts intelligently; chat drawers slide up on mobile but tile neatly on large displays.
* **Lightweight Rendering:** Unnecessary re-renders are minimized by detaching the video references from the React state tree where possible.
* **Optimized Animations:** Framer Motion animations use hardware-accelerated CSS properties (`transform`, `opacity`).
* **Touch-first Controls:** Enlarged padding, floating action buttons, and accessible safe areas.

---

## 14. Security & Privacy

* **Anonymous Communication:** No names, IP addresses, or personal data are exposed to peers.
* **Moderation Strategy:** Currently self-moderated via skips, with backend tracking of rapid disconnects.
* **Reporting System:** Integrated reporting tools for flagging inappropriate behavior.
* **Beta Testing Limitations:** The public beta is a controlled rollout with future access restricted by verified college emails.

---

## 15. Future Roadmap

* Verified Student Login (College Email Auth)
* AI Moderation (Computer Vision checks)
* Interest Matching (Tag-based pairing)
* Student Communities & Hubs
* Native Mobile App (React Native/Flutter)
* Voice Rooms (Discord style)
* Friend System & Direct Messaging
* Student Feeds & Announcements

---

## 16. Contribution Section

Have ideas for improving LEAD Connect? We'd love to hear from you.

Reach out with unique ideas or suggestions on LinkedIn: 
[https://linkedin.com/in/vishnu-k-7-](https://linkedin.com/in/vishnu-k-7-)

---

## 17. Developer

**Vishnu K**  
MCA student and developer passionate about realtime systems, scalable applications, and student-focused social platforms.

* GitHub: [https://github.com/vishnucax](https://github.com/vishnucax)
* Portfolio: [https://vishnucax.github.io](https://vishnucax.github.io)
* LinkedIn: [https://linkedin.com/in/vishnu-k-7-](https://linkedin.com/in/vishnu-k-7-)
* Instagram: [https://www.instagram.com/v1hxnuu/](https://www.instagram.com/v1hxnuu/)

---

## 18. License

This project is currently proprietary software built for LEAD College (Autonomous), Palakkad. All rights reserved.
