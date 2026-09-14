import React, { useState } from 'react';
import { Waves, Shield, CheckCircle2, Lock, ArrowUpRight, Zap, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MarketingPlanModal } from './MarketingPlanModal';

export const Footer: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const { packagePrice, platformConfig } = useAuth();
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const unitPrice = packagePrice;
  const lockMins = platformConfig?.reservation_lock_minutes || 8;

  return (
    <footer className="bg-slate-950 border-t border-cyan-900/30 pt-16 pb-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-32 bg-cyan-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-400 p-0.5">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <Waves className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <span className="text-xl font-bold font-display tracking-tight text-white">
                Money<span className="text-cyan-400">Ocean</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Decentralized peer-to-peer affiliate distribution system. 100% direct payouts settled in seconds via UPI directly to your bank account.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>P2P Smart Ledger Live & Operational</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button onClick={() => onNavigate('landing')} className="hover:text-cyan-400 transition-colors">
                  Overview & Model
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('signup')} className="hover:text-cyan-400 transition-colors">
                  Join / Sign Up
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-cyan-400 transition-colors">
                  Member Login
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('checkout')} className="hover:text-cyan-400 transition-colors">
                  Activation Gateway
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setShowMarketingModal(true)} 
                  className="hover:text-[#e5a93c] text-amber-400/90 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#e5a93c]" />
                  <span>Marketing Plan (PDF)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Architecture & Transparency */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Protocol Specs</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>₹{unitPrice.toLocaleString('en-IN')} P2P Package</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>1st & 3rd Pass-Up System</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>100% Direct Payouts (#2, #4+)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Zero Admin Holding / Direct UPI</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Security & Assurance */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">P2P Security</h4>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <Lock className="w-3.5 h-3.5" />
                <span>{lockMins}-Minute Anti-Collision Slot</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Every sale is locked for {lockMins} minutes to prevent race conditions and ensure 100% accurate referral attribution.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} MoneyOcean Platform. All rights reserved. Transparent community wealth platform.
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Powered by Supabase & ZapUPI Realtime Engine
            </span>
          </div>
        </div>
      </div>

      {/* Marketing Plan Presentation Modal */}
      <MarketingPlanModal 
        isOpen={showMarketingModal} 
        onClose={() => setShowMarketingModal(false)} 
      />
    </footer>
  );
};
