'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans selection:bg-blue-100">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-[#0f172a] transition-colors mb-10 font-medium"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8">
            <Shield className="w-8 h-8" />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-slate-500 mb-10">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            
            <section>
              <h2 className="text-xl font-bold text-[#0f172a] mb-3">1. Beta Testing Disclaimer</h2>
              <p>
                LEAD Connect is currently in Open Beta. By using this platform, you acknowledge that features, performance, and data handling may be subject to changes. The service is provided "as is" for testing and community feedback.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0f172a] mb-3">2. Anonymous Chatting & Video Communication</h2>
              <p>
                To provide a frictionless experience, we do not require account creation during the beta phase. Your identity is represented by an anonymous randomly generated session ID. Video and audio streams are transmitted securely using WebRTC protocols.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0f172a] mb-3">3. Permissions Usage</h2>
              <p>
                LEAD Connect requires access to your device's Camera and Microphone strictly to facilitate realtime video communication. We do not record, store, or transmit your media to our servers. The connection is established directly between peers (or via temporary relay servers) and is discarded immediately once the session ends.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0f172a] mb-3">4. Moderation & Reporting Abuse</h2>
              <p>
                We are committed to maintaining a safe environment. Users are empowered to flag and report inappropriate behavior using the "Report" button during a chat. Reported sessions are flagged in our system, and abusive IP addresses or session IDs will be permanently banned from the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0f172a] mb-3">5. Data Collection</h2>
              <p>
                We collect minimal operational data, such as generic connection logs and error reports, strictly for debugging and improving platform performance. We do not sell or share any user data with third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0f172a] mb-3">6. Future Updates</h2>
              <p>
                As LEAD Connect transitions out of beta, access will be restricted to verified LEAD College students, requiring official college credentials. This Privacy Policy will be updated accordingly.
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
