'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function LandingPage() {
  const router = useRouter();
  const [onlineCount, setOnlineCount] = useState(0);
  const [animatedCount, setAnimatedCount] = useState(0);
  const countRef = useRef(null);

  // Fetch online count
  useEffect(() => {
    document.body.classList.add('landing-body');
    document.body.classList.remove('chat-body');
    return () => document.body.classList.remove('landing-body');
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          setOnlineCount(data.onlineCount || 0);
        }
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // Animate count
  useEffect(() => {
    if (onlineCount === 0) return;
    let start = 0;
    const step = Math.ceil(onlineCount / 40);
    const timer = setInterval(() => {
      start = Math.min(start + step, onlineCount);
      setAnimatedCount(start);
      if (start >= onlineCount) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [onlineCount]);

  const features = [
    {
      icon: '⚡',
      title: 'Instant Connection',
      desc: 'Match with a real person in under 2 seconds. No waiting, no queues.',
      color: 'rgba(234,179,8,0.15)',
      border: 'rgba(234,179,8,0.25)',
    },
    {
      icon: '🎭',
      title: 'Stay Anonymous',
      desc: 'No account needed. No tracking. Pure authentic conversation.',
      color: 'rgba(139,92,246,0.12)',
      border: 'rgba(139,92,246,0.25)',
    },
    {
      icon: '📡',
      title: 'HD Video & Audio',
      desc: 'Crystal clear WebRTC video calling powered by modern browser tech.',
      color: 'rgba(34,211,238,0.1)',
      border: 'rgba(34,211,238,0.2)',
    },
    {
      icon: '💬',
      title: 'Live Text Chat',
      desc: 'Chat alongside video. Send emoji, memes, and quick messages.',
      color: 'rgba(236,72,153,0.1)',
      border: 'rgba(236,72,153,0.2)',
    },
    {
      icon: '🔒',
      title: 'Private & Secure',
      desc: 'Peer-to-peer encrypted video. We never store your conversations.',
      color: 'rgba(34,197,94,0.1)',
      border: 'rgba(34,197,94,0.2)',
    },
    {
      icon: '📱',
      title: 'Mobile First',
      desc: 'Designed for phones. Works perfectly on any screen size.',
      color: 'rgba(99,102,241,0.12)',
      border: 'rgba(99,102,241,0.25)',
    },
  ];

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <div className="hero-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div className="grid-lines" />

      {/* Nav */}
      <nav className="hero-content sticky top-0 z-50 flex items-center justify-between px-5 py-4 md:px-12"
        style={{ background: 'rgba(7,8,10,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
            fontSize: 18
          }}>📡</div>
          <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: 18 }}>TalkRandom</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="online-pill" style={{ display: 'none' }} id="nav-online">
            <div className="online-dot" />
            {animatedCount} online
          </div>
          <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}
            onClick={() => router.push('/chat')}>
            Start Now →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-content flex flex-col items-center text-center px-5 pt-20 pb-16 md:pt-32 md:pb-24">
        {/* Badges row */}
        <div className="flex items-center gap-3 mb-8 flex-wrap justify-center anim-fade-up">
          <div className="badge badge-live">
            <div className="live-dot" />
            Live Now
          </div>
          <div className="online-pill">
            <div className="online-dot" />
            <span>{animatedCount > 0 ? `${animatedCount.toLocaleString()} people online` : 'Loading…'}</span>
          </div>
          <div className="badge badge-new">✨ No Sign-Up Required</div>
        </div>

        {/* Main headline */}
        <h1 className="anim-fade-up delay-100"
          style={{
            fontFamily: 'var(--font-space)',
            fontSize: 'clamp(40px, 8vw, 80px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            maxWidth: 800,
            marginBottom: 20,
          }}>
          <span className="gradient-text">Talk to Strangers</span>
          <br />Instantly.
        </h1>

        <p className="anim-fade-up delay-200"
          style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'var(--text-secondary)',
            maxWidth: 520,
            lineHeight: 1.6,
            marginBottom: 40,
          }}>
          Random video chat with real people around the world.
          One click. Zero friction. Just connect.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center anim-fade-up delay-300">
          <button className="btn-primary" style={{ fontSize: 16, padding: '16px 36px' }}
            onClick={() => router.push('/chat?mode=video')}>
            📹 Start Video Chat
          </button>
          <button className="btn-secondary" style={{ fontSize: 16, padding: '16px 36px' }}
            onClick={() => router.push('/chat?mode=text')}>
            💬 Start Text Chat
          </button>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center gap-6 mt-12 flex-wrap justify-center anim-fade-up delay-400">
          {['🔒 End-to-End Encrypted', '👤 100% Anonymous', '⚡ Free Forever'].map(t => (
            <span key={t} style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>{t}</span>
          ))}
        </div>
      </section>

      {/* Mock Preview */}
      <section className="hero-content px-5 pb-20 md:pb-28 flex justify-center anim-fade-up delay-500">
        <div style={{
          width: '100%', maxWidth: 900,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)',
          padding: 3,
        }}>
          {/* Fake browser bar */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {['#ef4444','#f59e0b','#22c55e'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
            <div style={{
              flex: 1, marginLeft: 12,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 6, height: 24,
              display: 'flex', alignItems: 'center', paddingLeft: 10,
              fontSize: 12, color: 'var(--text-muted)',
            }}>talkrandom.app</div>
          </div>

          {/* Fake video chat preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, background: '#000', padding: 3, borderRadius: '0 0 26px 26px', minHeight: 300 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(99,102,241,0.1) 100%)',
              borderRadius: 20, minHeight: 280, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative',
            }}>
              <div style={{ fontSize: 48 }}>👤</div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Stranger</span>
              <div style={{
                position: 'absolute', bottom: 14, left: 14,
                padding: '4px 12px', borderRadius: 99,
                background: 'rgba(0,0,0,0.5)', fontSize: 12,
                backdropFilter: 'blur(8px)',
              }}>Stranger 🌍</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(139,92,246,0.15) 100%)',
              borderRadius: 20, minHeight: 280, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative',
            }}>
              <div style={{ fontSize: 48 }}>😊</div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>You</span>
              <div style={{
                position: 'absolute', bottom: 14, left: 14,
                padding: '4px 12px', borderRadius: 99,
                background: 'rgba(0,0,0,0.5)', fontSize: 12,
                backdropFilter: 'blur(8px)',
              }}>You</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="hero-content px-5 pb-24 md:px-12">
        <div className="text-center mb-12">
          <h2 className="anim-fade-up" style={{
            fontFamily: 'var(--font-space)', fontSize: 'clamp(28px,5vw,44px)',
            fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            Everything you need to <span className="gradient-text-hot">connect</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Built for spontaneous, real human connection.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16, maxWidth: 1000, margin: '0 auto',
        }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card anim-fade-up" style={{ animationDelay: `${0.05 * i}s` }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: f.color, border: `1px solid ${f.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 16,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="hero-content px-5 pb-28 text-center">
        <div style={{
          maxWidth: 600, margin: '0 auto',
          padding: '60px 40px',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(99,102,241,0.05) 100%)',
          border: '1px solid rgba(139,92,246,0.2)',
          boxShadow: '0 0 80px rgba(139,92,246,0.1)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{
            fontFamily: 'var(--font-space)', fontSize: 'clamp(24px,4vw,36px)',
            fontWeight: 700, marginBottom: 12,
          }}>
            Ready to meet someone new?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 16, lineHeight: 1.6 }}>
            Join thousands of people already connecting right now.
            No sign-up. No download. Just click and go.
          </p>
          <button className="btn-primary" style={{ fontSize: 17, padding: '18px 44px' }}
            onClick={() => router.push('/chat')}>
            Start Chatting Now →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="hero-content px-5 py-8 text-center"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
        <p>© 2025 TalkRandom. Made with ❤️ for spontaneous human connection.</p>
      </footer>
    </div>
  );
}
