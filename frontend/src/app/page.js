'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, MessageSquare, Heart, Github, Globe, Instagram, CheckCircle2, Navigation, Mail, Linkedin, Copy, Check, Share2, Lightbulb } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);

  // Loading Screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const copyUpi = () => {
    navigator.clipboard.writeText('vishnukthekkil@okaxis');
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LEAD Connect',
          text: 'Join LEAD Connect to meet and chat with other students!',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-10">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative z-10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/Assets/Images/Leadconnect-loading.PNG" 
                alt="LEAD Connect Loading" 
                className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </motion.div>
            <motion.div 
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-blue-500 rounded-full blur-[60px] -z-10"
            />
          </div>
          
          <motion.h1 
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mb-2 tracking-tight text-center px-4"
          >
            Connecting People Beyond Departments
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[#475569] font-medium tracking-wide text-sm md:text-base uppercase"
          >
            LEAD Connect Beta
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="landing-page bg-[#f8fafc] overflow-hidden">
      {/* Background Orbs */}
      <div className="hero-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="grid-lines"></div>
      </div>

      <div className="relative z-10 w-full px-6 pt-20 pb-24 flex flex-col items-center">
        
        {/* Header / Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-16 bg-white/60 backdrop-blur-md px-6 py-3 rounded-full shadow-sm border border-slate-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/Assets/Images/Leadconnect-logo.PNG" 
            alt="LEAD Connect Logo" 
            className="w-8 h-8 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="font-bold text-[#0f172a] tracking-tight">LEAD Connect</span>
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Beta</span>
        </motion.div>

        {/* 1. HERO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center w-full max-w-5xl mx-auto mb-24"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-[#0f172a] tracking-tight mb-6 leading-[1.1]">
            Meet New People <br className="hidden md:block"/>
            <span className="gradient-text">Instantly</span>
          </h1>
          <p className="text-lg md:text-xl text-[#475569] mb-10 leading-relaxed max-w-2xl mx-auto">
            LEAD Connect helps students connect freely beyond department boundaries through live video and chat.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4">
            <button 
              onClick={() => router.push('/chat')}
              className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-4 px-8 text-lg shadow-lg hover:shadow-xl"
            >
              <Video className="w-5 h-5" /> Start Video Chat
            </button>
            <button 
              onClick={() => router.push('/chat')}
              className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 py-4 px-8 text-lg"
            >
              <MessageSquare className="w-5 h-5" /> Start Text Chat
            </button>
          </div>
          
          <button 
            onClick={() => setShowSupportModal(true)}
            className="mt-6 flex items-center justify-center gap-2 mx-auto text-[#64748b] hover:text-[#3b82f6] transition-colors font-medium text-sm"
          >
            <Heart className="w-4 h-4" /> Support Us
          </button>
        </motion.div>

        {/* 2. ABOUT LEAD CONNECT SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-5xl mx-auto mb-24"
        >
          <div className="glass p-8 md:p-12 rounded-[2rem] border border-blue-50/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] -z-10 opacity-60 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] -z-10 opacity-60 pointer-events-none" />
            
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/Assets/Images/Leadconnect-logo.PNG" 
              alt="LEAD Connect Logo" 
              className="w-20 h-20 object-contain mx-auto mb-6 drop-shadow-xl"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] mb-8 tracking-tight">About LEAD Connect</h2>
            
            <div className="max-w-3xl mx-auto text-[#475569] text-base md:text-lg leading-relaxed space-y-6">
              <p className="font-bold text-[#0f172a] text-xl italic">"Everyone starts as strangers."</p>
              <p>
                At some point, every friend was once a stranger. Departments often separate students from each other, limiting the chance to meet incredible peers right next door.
              </p>
              <p>
                To help students connect, make friendships, recognize familiar faces, and build meaningful conversations, we created LEAD Connect. Built specifically for LEAD students, it's a safe social connection platform designed to turn strangers into friends.
              </p>
            </div>

            <div className="mt-10 pt-10 border-t border-slate-200/50 flex flex-col items-center">
              <button 
                onClick={handleShare}
                className="group flex items-center justify-center gap-3 py-4 px-8 bg-white border border-slate-200 rounded-full text-[#0f172a] font-bold text-base md:text-lg hover:border-blue-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:-translate-y-1 transition-all"
              >
                <Share2 className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" /> 
                Share with your mates & chill
              </button>
              <p className="text-sm text-slate-400 mt-4 font-medium">Help more LEAD students connect and make new friendships.</p>
            </div>
          </div>
        </motion.section>

        {/* 3. WHAT IS LEAD CONNECT SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-5xl mx-auto mb-24"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#0f172a] mb-12 tracking-tight">What is LEAD Connect?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass p-8 rounded-3xl text-center transform transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">Beyond Boundaries</h3>
              <p className="text-[#475569] text-sm leading-relaxed">A real-time stranger video and live chat platform created to help students connect and socialize beyond their own departments.</p>
            </div>
            <div className="glass p-8 rounded-3xl text-center transform transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">Open Beta</h3>
              <p className="text-[#475569] text-sm leading-relaxed">Currently in beta testing. Temporarily open for everyone to experience the platform seamlessly and provide valuable feedback.</p>
            </div>
            <div className="glass p-8 rounded-3xl text-center transform transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Navigation className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">Future Access</h3>
              <p className="text-[#475569] text-sm leading-relaxed">Future major updates will restrict access exclusively to verified LEAD College students to ensure a safe, closed community.</p>
            </div>
          </div>
        </motion.section>

        {/* 4. FUTURE VISION / ROADMAP SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-5xl mx-auto mb-24"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] mb-4 tracking-tight">Future Vision & Roadmap</h2>
            <p className="text-[#475569] max-w-2xl mx-auto leading-relaxed text-lg">
              LEAD Connect is <span className="font-bold text-[#0f172a]">NOT</span> intended to remain just a stranger video chat platform. This is only the FIRST STEP.
            </p>
          </div>

          <div className="glass p-8 md:p-12 rounded-[2rem] border border-blue-50/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] mb-8">
            <h3 className="text-2xl font-bold text-[#0f172a] mb-4 text-center">The Big Picture</h3>
            <p className="text-center text-[#475569] text-base md:text-lg leading-relaxed mb-8 max-w-3xl mx-auto">
              Our vision is to evolve LEAD Connect into a unique social media ecosystem built specifically for LEAD students. We envision a platform fostering student communities, verified student networks, college interactions, interest groups, and campus networking.
              <br/><br/>
              <span className="font-semibold text-blue-600">This stranger connection platform is just the beginning.</span>
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-10 pt-10 border-t border-slate-200/50">
              {[
                'Verified Student Login',
                'AI Moderation Systems',
                'Friend System',
                'Interest Matching',
                'Voice Rooms',
                'College Communities',
                'Mobile App',
                'Student Feeds',
                'Safer Moderation'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white/60 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <span className="font-bold text-[#0f172a] text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-[#475569] mb-6 font-medium">If you have unique ideas or suggestions for improving LEAD Connect, let us know.</p>
            <a href="https://linkedin.com/in/vishnu-k-7-" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-[#0a66c2] text-white rounded-full font-bold hover:bg-[#084e96] transition-transform hover:-translate-y-1 shadow-[0_0_20px_rgba(10,102,194,0.3)]">
              <Linkedin className="w-5 h-5" /> Connect on LinkedIn
            </a>
          </div>
        </motion.section>

        {/* 5. EXCLUSIVELY BUILT FOR LEAD COLLEGE SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-5xl mx-auto mb-24"
        >
          <div className="glass p-10 md:p-14 rounded-[2rem] border border-blue-50/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] text-center relative overflow-hidden">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] mb-4 tracking-tight">Exclusively Built for LEAD College (Autonomous), Palakkad Students</h2>
            <p className="text-[#475569] text-base md:text-lg leading-relaxed max-w-3xl mx-auto font-medium">
              Currently open for public beta testing. Future versions will be restricted to verified LEAD College students only.
            </p>
          </div>

          {/* AUTO-SCROLLING NEWS / ANNOUNCEMENT BAR */}
          <div className="mt-8 overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm relative group flex items-center h-14">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#f8fafc] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#f8fafc] to-transparent z-10 pointer-events-none" />
            
            <motion.div 
              animate={{ x: ["0%", "-50%"] }}
              transition={{ ease: "linear", duration: 25, repeat: Infinity }}
              className="flex items-center whitespace-nowrap text-sm md:text-base font-semibold text-[#0f172a] group-hover:[animation-play-state:paused]"
              style={{ width: "fit-content" }}
            >
              {/* First Set */}
              <span className="mx-6 text-blue-600">•</span> LEAD Connect Beta v1.0.5 released on April 22, 2026 
              <span className="mx-6 text-blue-600">•</span> Public beta testing is now live 
              <span className="mx-6 text-blue-600">•</span> Anyone can connect during testing phase 
              <span className="mx-6 text-blue-600">•</span> Official release will be exclusive to LEAD College students 
              <span className="mx-6 text-blue-600">•</span> More features coming soon 
              
              {/* Duplicated Set for Seamless Infinite Scroll */}
              <span className="mx-6 text-blue-600">•</span> LEAD Connect Beta v1.0.5 released on April 22, 2026 
              <span className="mx-6 text-blue-600">•</span> Public beta testing is now live 
              <span className="mx-6 text-blue-600">•</span> Anyone can connect during testing phase 
              <span className="mx-6 text-blue-600">•</span> Official release will be exclusive to LEAD College students 
              <span className="mx-6 text-blue-600">•</span> More features coming soon
            </motion.div>
          </div>
        </motion.section>

        {/* 6. MEET THE DEVELOPER SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-5xl mx-auto mb-24"
        >
          <div className="text-center mb-10">
             <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight">Meet the Developer</h2>
          </div>
          <div className="glass p-8 md:p-12 rounded-[2rem] border border-blue-100 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-blue-100 rounded-full blur-[100px] -z-10 opacity-60 pointer-events-none" />
            
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden flex-shrink-0 shadow-[0_0_0_6px_rgba(255,255,255,0.8),0_0_30px_rgba(59,130,246,0.3)] transform transition-transform hover:scale-105 duration-300">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img 
                 src="/Assets/Images/vishnu-developer.jpeg" 
                 alt="Vishnu K" 
                 className="w-full h-full object-cover"
                 onError={(e) => { e.target.style.display = 'none'; }}
               />
            </div>
            
            <div className="flex-1 text-center md:text-left z-10">
              <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">Creator</div>
              <h3 className="text-3xl md:text-4xl font-bold text-[#0f172a] mb-2 tracking-tight">Vishnu K</h3>
              <p className="text-[#3b82f6] font-semibold text-[15px] md:text-base mb-5">MCA Student • Backend & Realtime Systems Enthusiast</p>
              <p className="text-[#475569] text-[15px] md:text-base leading-relaxed mb-8 max-w-2xl mx-auto md:mx-0">
                I am deeply passionate about meaningful technology, with strong interests in DevOps, cloud infrastructure, and building scalable platforms. I created LEAD Connect with a clear vision: to develop a student-focused platform that genuinely empowers campus interaction and turns everyday strangers into lifelong friends.
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <a href="https://www.instagram.com/v1hxnuu/" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#fd5949] to-[#d6249f] text-white flex items-center justify-center hover:-translate-y-1 transition-transform shadow-lg">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="mailto:vishnukookkal@gmail.com" className="w-12 h-12 rounded-full bg-white border border-slate-200 text-[#0f172a] flex items-center justify-center hover:bg-slate-50 hover:-translate-y-1 transition-transform shadow-sm">
                  <Mail className="w-5 h-5" />
                </a>
                <a href="https://github.com/vishnucax" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#0f172a] text-white flex items-center justify-center hover:bg-[#1e293b] hover:-translate-y-1 transition-transform shadow-lg">
                  <Github className="w-5 h-5" />
                </a>
                <a href="https://linkedin.com/in/vishnu-k-7-" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#0a66c2] text-white flex items-center justify-center hover:bg-[#084e96] hover:-translate-y-1 transition-transform shadow-lg">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://vishnucax.github.io" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-0 h-12 bg-white border border-slate-200 text-[#0f172a] rounded-full text-sm font-bold hover:bg-slate-50 hover:-translate-y-1 transition-transform shadow-sm">
                  <Globe className="w-4 h-4" /> Portfolio
                </a>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 7. SUPPORT LEAD CONNECT SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-5xl mx-auto mb-12"
        >
          <div className="glass p-8 md:p-12 rounded-[2rem] text-center border border-indigo-100 shadow-[0_8px_30px_rgba(59,130,246,0.08)] bg-gradient-to-b from-white/60 to-blue-50/30">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
              <Heart className="w-8 h-8 fill-current" />
            </div>
            <h2 className="text-3xl font-bold text-[#0f172a] mb-4 tracking-tight">Support LEAD Connect</h2>
            <p className="text-[#475569] text-base leading-relaxed max-w-xl mx-auto mb-8 font-medium">
              For deployment, server maintenance, infrastructure costs, and future improvements, your support helps keep LEAD Connect growing.
            </p>
            <button 
              onClick={() => setShowSupportModal(true)}
              className="btn-primary py-4 px-10 text-lg shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:-translate-y-1 transition-transform"
            >
              <Heart className="w-5 h-5 fill-current" /> Support Us
            </button>
          </div>
        </motion.section>

      </div>

      {/* 8. FOOTER */}
      <footer className="border-t border-[#e2e8f0] bg-white py-12 relative z-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            <a href="https://github.com/vishnucax" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#0f172a] hover:text-white transition-all shadow-sm">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://vishnucax.github.io" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#3b82f6] hover:text-white transition-all shadow-sm">
              <Globe className="w-5 h-5" />
            </a>
            <a href="https://www.instagram.com/v1hxnuu/" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-gradient-to-tr hover:from-[#fd5949] hover:to-[#d6249f] hover:text-white transition-all shadow-sm">
              <Instagram className="w-5 h-5" />
            </a>
          </div>
          <div className="text-center">
            <p className="text-[#64748b] text-sm font-medium">Developed by <a href="https://vishnucax.github.io" target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline font-bold">Vishnu K</a></p>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#94a3b8] font-medium">
              <a href="/privacy" className="hover:text-[#0f172a] transition-colors">Privacy Policy</a>
              <span>•</span>
              <span className="font-bold text-slate-400">LEAD Connect Beta © {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* SUPPORT MODAL IMPROVED */}
      <AnimatePresence>
        {showSupportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowSupportModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              onClick={e => e.stopPropagation()}
              className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
            >
              <button 
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                ✕
              </button>
              
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 fill-blue-600" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-[#0f172a] mb-2 tracking-tight">Support the Developer</h3>
              <p className="text-[#475569] text-sm leading-relaxed mb-6 font-medium">
                Your support helps cover server costs and keeps the platform running smoothly.
              </p>
              
              <div className="w-56 h-56 mx-auto bg-white border border-slate-200 rounded-3xl mb-6 flex items-center justify-center overflow-hidden relative shadow-[0_0_40px_rgba(59,130,246,0.3)]">
                {/* Fallback QR area if image fails */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                  <p>QR Code</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/Assets/Images/developerqr.jpeg" 
                  alt="Support QR Code" 
                  className="w-full h-full object-cover relative z-10 p-2"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Copy UPI Option */}
              <button 
                onClick={copyUpi}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 mb-4 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
              >
                {upiCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {upiCopied ? 'UPI ID Copied!' : 'Copy UPI ID'}
              </button>

              <button 
                onClick={() => setShowSupportModal(false)}
                className="w-full py-3 bg-[#0f172a] text-white font-bold rounded-xl hover:bg-[#1e293b] transition-colors shadow-md"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
