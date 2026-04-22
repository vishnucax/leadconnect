'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, MessageSquare, Heart, Github, Globe, Instagram, CheckCircle2, Navigation, Loader2, Mail, Linkedin, Copy, Check } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);

  // Loading Screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const copyUpi = () => {
    navigator.clipboard.writeText('vishnukthekkil@okaxis'); // placeholder
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/Assets/Images/Leadconnect-loading.PNG" 
            alt="LEAD Connect Loading" 
            className="w-32 h-32 mb-6 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          
          <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin mb-6" />
          
          <h1 className="text-2xl font-bold text-[#0f172a] mb-2 tracking-tight">LEAD Connect Beta</h1>
          <p className="text-[#475569] font-medium tracking-wide">Connecting People Beyond Departments</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="landing-page bg-[#f8fafc]">
      {/* Background Orbs */}
      <div className="hero-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="grid-lines"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24 flex flex-col items-center">
        
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

        {/* HERO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center max-w-3xl mb-16"
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
            <Heart className="w-4 h-4" /> Support Developer
          </button>
        </motion.div>

        {/* ABOUT LEAD COLLEGE PALAKKAD SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mt-8 mb-24"
        >
          <div className="glass p-8 md:p-12 rounded-[2rem] border border-blue-50/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="w-full md:w-1/2 flex-shrink-0">
                <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-xl transform transition-transform hover:scale-[1.02] duration-500">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/Assets/Images/leadcollege.png" 
                    alt="LEAD College Palakkad" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute bottom-4 left-4 z-20">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/30 uppercase tracking-wider">Palakkad, Kerala</span>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] mb-5 tracking-tight">About LEAD College Palakkad</h2>
                <p className="text-[#475569] text-[15px] md:text-base leading-relaxed mb-6">
                  LEAD College Palakkad stands at the forefront of innovation-driven learning, fostering a vibrant student community dedicated to excellence. Our modern education environment is designed to cultivate leadership, inspire creativity, and promote a highly collaborative culture. 
                </p>
                <p className="text-[#475569] text-[15px] md:text-base leading-relaxed font-medium">
                  We believe in holistic student growth—equipping the next generation of thinkers and builders to shape the future with passion and purpose.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* WHAT IS LEAD CONNECT SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mb-24"
        >
          <h2 className="text-3xl font-bold text-center text-[#0f172a] mb-12">What is LEAD Connect?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass p-8 rounded-3xl text-center">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">Beyond Boundaries</h3>
              <p className="text-[#475569] text-sm leading-relaxed">A platform created to help students connect, socialize, and make friendships beyond department boundaries.</p>
            </div>
            <div className="glass p-8 rounded-3xl text-center">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">Open Beta</h3>
              <p className="text-[#475569] text-sm leading-relaxed">Currently in beta testing and temporarily open for everyone to experience and provide feedback.</p>
            </div>
            <div className="glass p-8 rounded-3xl text-center">
              <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Navigation className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">Future Roadmap</h3>
              <p className="text-[#475569] text-sm leading-relaxed">Future updates will include restricted access exclusively for verified LEAD College students.</p>
            </div>
          </div>
        </motion.section>

        {/* ROADMAP SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mb-24 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center text-[#0f172a] mb-12">Planned Features</h2>
          <div className="glass p-8 rounded-3xl">
            <div className="flex flex-col gap-6">
              {[
                { title: 'Verified Student Login', desc: 'Secure login strictly for LEAD students' },
                { title: 'Interest Matching', desc: 'Find peers based on skills and hobbies' },
                { title: 'Mobile App', desc: 'Native iOS and Android application' },
                { title: 'Safer Community Tools', desc: 'AI moderation and reporting system' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#f1f5f9] border-2 border-[#cbd5e1] flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0f172a] text-lg">{item.title}</h4>
                    <p className="text-[#64748b] text-sm mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ABOUT DEVELOPER SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mb-24 max-w-4xl mx-auto"
        >
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
              <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-3">Lead Developer</div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] mb-2 tracking-tight">Vishnu K</h2>
              <p className="text-[#3b82f6] font-semibold text-[15px] md:text-base mb-5">MCA Student & Realtime Systems Enthusiast</p>
              <p className="text-[#475569] text-[15px] md:text-base leading-relaxed mb-8 max-w-2xl">
                Passionate builder with a focus on backend architecture, DevOps, and cloud technologies. I created LEAD Connect to bridge the gap between departments and foster a genuinely connected campus culture. My vision is to build meaningful platforms that empower student interaction and growth.
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <a href="https://github.com/vishnucax" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#0f172a] text-white flex items-center justify-center hover:bg-[#1e293b] hover:-translate-y-1 transition-all shadow-lg">
                  <Github className="w-5 h-5" />
                </a>
                <a href="https://linkedin.com/in/vishnu-k-7-" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#0a66c2] text-white flex items-center justify-center hover:bg-[#084e96] hover:-translate-y-1 transition-all shadow-lg">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/v1hxnuu/" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#fd5949] to-[#d6249f] text-white flex items-center justify-center hover:-translate-y-1 transition-all shadow-lg">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="mailto:vishnukookkal@gmail.com" className="w-12 h-12 rounded-full bg-white border border-slate-200 text-[#0f172a] flex items-center justify-center hover:bg-slate-50 hover:-translate-y-1 transition-all shadow-sm">
                  <Mail className="w-5 h-5" />
                </a>
                <a href="https://vishnucax.github.io" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-0 h-12 bg-white border border-slate-200 text-[#0f172a] rounded-full text-sm font-bold hover:bg-slate-50 hover:-translate-y-1 transition-all shadow-sm">
                  <Globe className="w-4 h-4" /> Portfolio
                </a>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SUPPORT US CARD (ABOVE FOOTER) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mb-12 max-w-3xl mx-auto"
        >
          <div className="glass p-8 md:p-12 rounded-[2rem] text-center border border-indigo-100 shadow-[0_8px_30px_rgba(59,130,246,0.08)] bg-gradient-to-b from-white/60 to-blue-50/30">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
              <Heart className="w-8 h-8 fill-current" />
            </div>
            <h2 className="text-3xl font-bold text-[#0f172a] mb-4">Support LEAD Connect</h2>
            <p className="text-[#475569] text-base leading-relaxed max-w-xl mx-auto mb-8">
              For deployment, server maintenance, platform improvements, and future development, your support helps keep LEAD Connect growing.
            </p>
            <button 
              onClick={() => setShowSupportModal(true)}
              className="btn-primary py-4 px-10 text-lg shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            >
              <Heart className="w-5 h-5 fill-current" /> Support Us
            </button>
          </div>
        </motion.section>

      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#e2e8f0] bg-white py-12 relative z-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            <a href="https://github.com/vishnucax" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#0f172a] hover:text-white transition-all">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://vishnucax.github.io" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#3b82f6] hover:text-white transition-all">
              <Globe className="w-5 h-5" />
            </a>
            <a href="https://www.instagram.com/v1hxnuu/" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-gradient-to-tr hover:from-[#fd5949] hover:to-[#d6249f] hover:text-white transition-all">
              <Instagram className="w-5 h-5" />
            </a>
          </div>
          <div className="text-center">
            <p className="text-[#64748b] text-sm font-medium">Developed by <a href="https://vishnucax.github.io" target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline font-bold">Vishnu K</a></p>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#94a3b8]">
              <a href="/privacy" className="hover:text-[#0f172a] transition-colors">Privacy Policy</a>
              <span>•</span>
              <span>LEAD Connect Beta © {new Date().getFullYear()}</span>
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
              
              <h3 className="text-2xl font-extrabold text-[#0f172a] mb-2">Support the Developer</h3>
              <p className="text-[#475569] text-sm leading-relaxed mb-6">
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 mb-4 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                {upiCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {upiCopied ? 'UPI ID Copied!' : 'Copy UPI ID'}
              </button>

              <button 
                onClick={() => setShowSupportModal(false)}
                className="w-full py-3 bg-[#0f172a] text-white font-bold rounded-xl hover:bg-[#1e293b] transition-colors"
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
