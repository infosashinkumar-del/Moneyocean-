import React, { useState } from 'react';
import { 
  ArrowRight, 
  Banknote, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Globe2, 
  TrendingUp, 
  Award, 
  Users, 
  Target, 
  Compass, 
  DollarSign,
  FileText 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { MarketingPlanModal } from '../components/MarketingPlanModal';
import { ThreeDMatrixCard } from '../components/ThreeDMatrixCard';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { packagePrice, platformConfig } = useAuth();
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const unitPrice = packagePrice;
  const lockMins = platformConfig?.reservation_lock_minutes || 8;

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does the Pure 2-Up (1st & 3rd) Pass-Up System work?',
      a: `When you make direct sales, your 1st and 3rd sales pass up to your Qualifying Sponsor to qualify your ID. From that point on, you keep 100% (₹${unitPrice.toLocaleString('en-IN')} per sale) on Sale #2, #4, #5, #6, and all subsequent sales to infinity! In addition, EVERY member you sponsor must pass their 1st and 3rd sales up to YOU forever!`
    },
    {
      q: 'How much do I earn from sales after qualification?',
      a: `Sales #1 & #3 pass up to upline; Sales #2, #4, #5+ are 100% kept by direct sponsor with infinite recurring downline pass-ups. Every single direct sale from #2, #4, #5 onwards pays ₹${unitPrice.toLocaleString('en-IN')} directly to you with zero caps and no cycle reset cuts.`
    },
    {
      q: 'How are payments received?',
      a: 'Payments never touch a company bank account or central pool. All transactions are settled directly peer-to-peer via UPI (Google Pay, PhonePe, Paytm, BHIM) straight into your personal bank account or merchant UPI within seconds.'
    },
    {
      q: `What is the ${lockMins}-minute reservation lock during checkout?`,
      a: `To guarantee strict pass-up accuracy and prevent race conditions between simultaneous buyers, UltraPay locks the qualifying beneficiary slot for exactly ${lockMins} minutes. If payment is completed within ${lockMins} minutes, the slot settles instantly.`
    },
    {
      q: 'Do I need technical skills to start earning?',
      a: 'Not at all. You get a personalized live referral link with your unique code, ready-to-use WhatsApp & Telegram promo swipe copy, and a live genealogy dashboard to track downline pass-up earnings in real-time.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-[#e5a93c] selection:text-slate-950 gold-stars-bg">
      <Navbar onNavigate={onNavigate} currentRoute="landing" />

      {/* Hero Section */}
      <section className="relative pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-amber-500/10 blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Content Column */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 text-center lg:text-left space-y-6"
            >
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>AUTONOMOUS PEER-TO-PEER NETWORK</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-white leading-[1.12]">
                Empower Your Wealth with <span className="gold-gradient-text">UltraPay</span>
              </h1>

              {/* Official Tagline Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#0e1422] to-emerald-500/15 border border-amber-400/35 text-amber-200 text-xs sm:text-sm font-semibold tracking-wide shadow-md shadow-amber-500/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>"Har Second Settlement, Seedha Bank Account Mein."</span>
              </div>

              {/* Subhead */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Decentralized peer-to-peer community wealth protocol with automated 2-up pass-up architecture. 
                Earn <span className="text-[#e5a93c] font-semibold font-mono">₹{unitPrice.toLocaleString('en-IN')}</span> per sale settled instantly via direct UPI.
              </p>

              {/* CTA buttons with Direct Sign In and Join */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <button
                  onClick={() => onNavigate('signup')}
                  className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl gold-btn-gradient font-bold text-base cursor-pointer shadow-lg shadow-amber-500/20 hover:scale-[1.01]"
                >
                  <span>Start Earning ₹{unitPrice.toLocaleString('en-IN')}</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>

                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0e1422] hover:bg-[#162035] border border-slate-700/80 hover:border-amber-500/40 text-slate-200 hover:text-white font-semibold text-sm transition-all cursor-pointer shadow-md"
                >
                  <span>Sign In to Account</span>
                </button>

                <button
                  onClick={() => setShowMarketingModal(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-sm transition-all cursor-pointer shadow-md shadow-amber-500/10"
                >
                  <FileText className="w-4 h-4 text-[#e5a93c]" />
                  <span>Marketing Plan (PDF)</span>
                </button>
              </div>

              {/* Quick Trust Highlights */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  0% Admin Cut
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Zap className="w-3.5 h-3.5" />
                  Instant UPI
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Realtime
                </span>
              </div>
            </motion.div>

            {/* Right Column: Interactive 3D Matrix Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="lg:col-span-5 flex justify-center"
            >
              <ThreeDMatrixCard 
                unitPrice={unitPrice} 
                onJoinClick={() => onNavigate('signup')} 
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION: OUR VISION & OUR MISSION - UNIFIED THEME */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* OUR VISION CARD */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="gold-contour-card rounded-[28px] bg-[#0c1017]/95 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-[#e5a93c] text-xs font-bold uppercase tracking-wider mb-5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Future Outlook</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
                  Our Vision
                </h3>
                <p className="text-base text-slate-300 leading-relaxed">
                  At <strong className="text-[#e5a93c] font-bold">ULTRAPAY</strong>, we envision a world where financial growth is no longer a privilege, but a global standard. Our vision is to build a future where people from all walks of life gain access to powerful digital income tools, automated peer-to-peer protocols, and sustainable decentralized wealth creation.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-[#232c3f] flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400">Global Accessibility</span>
                <span className="text-xs font-bold text-amber-400">P2P Financial Freedom</span>
              </div>
            </motion.div>

            {/* OUR MISSION CARD - Unified with Emerald/Gold Fintech Aesthetic */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="emerald-contour-card rounded-[28px] bg-[#0c1017]/95 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Strategic Core</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
                  Our Mission
                </h3>
                <p className="text-base text-slate-300 leading-relaxed">
                  Our mission is to democratize wealth-building by equipping individuals worldwide with smart automation tools, transparent instant settlements, and real-time ledger verification. At <strong className="text-emerald-400 font-bold">ULTRAPAY</strong>, we are committed to helping everyday earners scale recurring direct income streams with zero friction.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-[#232c3f] flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400">Instant UPI Direct</span>
                <span className="text-xs font-bold text-emerald-400">100% P2P Execution</span>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Protocol Features Section */}
      <section className="py-20 bg-[#070b14]/70 border-t border-[#1a2233]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-[#e5a93c] uppercase tracking-widest font-mono mb-2">
              Autonomous Verification
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold font-display text-white tracking-tight">
              Why UltraPay Outperforms Legacy Matrix Models
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#0c1017]/90 border border-[#212a3d] relative group hover:border-[#e5a93c]/50 transition-all hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-[#e5a93c] mb-6 group-hover:scale-110 transition-transform">
                <Banknote className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold font-display text-white mb-3">
                100% Direct UPI Settlements
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Funds are transferred peer-to-peer directly into the beneficiary's UPI account via direct realtime gateway with zero intermediary retention.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0c1017]/90 border border-[#212a3d] relative group hover:border-[#e5a93c]/50 transition-all hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold font-display text-white mb-3">
                Cryptographic Pass-Up Audit
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Double-entry transaction logs mathematically record the origin, sponsor, qualifying beneficiary, and webhook signature for every sale.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0c1017]/90 border border-[#212a3d] relative group hover:border-[#e5a93c]/50 transition-all hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-[#e5a93c] mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold font-display text-white mb-3">
                Infinite 2-Up Compounding
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every member you sponsor passes 2 sales up to you, and those sales pass 2 sales up to you, creating an exponential compounding income stream.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Downline Multiplier Section - Unified Palette */}
      <section id="how-it-works" className="py-20 bg-[#050811] border-t border-[#1a2233]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Pass-up compounding callout */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-950/30 via-[#0c1017] to-emerald-950/30 border border-amber-500/30 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center lg:text-left">
              <h4 className="text-2xl font-bold font-display text-white">
                The Downline Multiplier Effect
              </h4>
              <p className="text-sm text-slate-300 max-w-2xl">
                When you sponsor 10 direct partners, each of them MUST pass their 1st and 3rd sales to YOU. That is <span className="text-amber-400 font-bold">20 pass-up sales × ₹{unitPrice.toLocaleString('en-IN')} = ₹{(20 * unitPrice).toLocaleString('en-IN')}</span> in 100% passive incoming transfers!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                onClick={() => setShowMarketingModal(true)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#121824] hover:bg-[#182133] border border-[#23314d] text-amber-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-amber-500/40"
              >
                <FileText className="w-4 h-4 text-[#e5a93c]" />
                <span>Download Marketing Plan (PDF)</span>
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl gold-btn-gradient font-bold text-sm shrink-0 cursor-pointer"
              >
                Activate Your Earning Slot
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-[#07090e] border-t border-[#171e2c]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-xs font-semibold text-[#e5a93c] uppercase tracking-widest font-mono mb-2">
              Frequently Asked Questions
            </h2>
            <h3 className="text-3xl font-bold font-display text-white tracking-tight">
              Got Questions? We Have Answers.
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-[#0c1017]/80 border border-[#1e2738] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-base text-white hover:text-[#e5a93c] transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-[#e5a93c] shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e2738] pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 bg-gradient-to-b from-[#07090e] to-[#0c1017] border-t border-amber-500/20 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight mb-6">
            Step into <span className="gold-gradient-text">UltraPay</span> Today
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mb-8 max-w-xl mx-auto">
            Join hundreds of members generating autonomous ₹{unitPrice.toLocaleString('en-IN')} UPI payments every day with verifiable P2P technology.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('signup')}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl gold-btn-gradient font-bold text-base cursor-pointer"
            >
              <span>Create Free Account & Start</span>
              <ArrowRight className="w-5 h-5 text-slate-950" />
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="px-6 py-4 rounded-xl bg-[#111724] hover:bg-[#182133] border border-slate-700 text-slate-200 hover:text-white font-semibold text-base transition-all cursor-pointer"
            >
              <span>Member Sign In</span>
            </button>
          </div>
        </div>
      </section>

      {/* Marketing Plan Presentation Modal */}
      <MarketingPlanModal 
        isOpen={showMarketingModal} 
        onClose={() => setShowMarketingModal(false)} 
      />

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
