import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { UltraPayLogo } from './UltraPayLogo';

interface PaymentChakraRedirectProps {
  amount: number;
  orderId: string;
  beneficiaryName?: string;
  targetPaymentUrl?: string;
  onManualProceed?: () => void;
  onCancel?: () => void;
  autoRedirectSeconds?: number;
}

export const PaymentChakraRedirect: React.FC<PaymentChakraRedirectProps> = ({
  amount,
  orderId,
  beneficiaryName = 'Authorized Beneficiary',
  targetPaymentUrl,
  onManualProceed,
  onCancel,
  autoRedirectSeconds = 2.5
}) => {
  const [countdown, setCountdown] = useState<number>(autoRedirectSeconds);
  const [phaseText, setPhaseText] = useState<string>('Initializing 100% Secure P2P Channel...');
  const [progressPercent, setProgressPercent] = useState<number>(15);

  useEffect(() => {
    // Step 1: Connecting phase
    const t1 = setTimeout(() => {
      setPhaseText('Verifying Direct Bank Settlement Node...');
      setProgressPercent(45);
    }, 700);

    // Step 2: Routing phase
    const t2 = setTimeout(() => {
      setPhaseText('Routing Direct to UPI Apps (PhonePe / GPay / Paytm / BHIM)...');
      setProgressPercent(85);
    }, 1500);

    // Step 3: Trigger redirect
    const t3 = setTimeout(() => {
      setProgressPercent(100);
      setPhaseText('Launching Instant Payment Gateway...');
      if (onManualProceed) {
        onManualProceed();
      } else if (targetPaymentUrl) {
        window.location.href = targetPaymentUrl;
      }
    }, autoRedirectSeconds * 1000);

    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0.1 ? Number((prev - 0.1).toFixed(1)) : 0));
    }, 100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, [targetPaymentUrl, onManualProceed, autoRedirectSeconds]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050811]/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none animate-in fade-in duration-300">
      {/* Dynamic Background Glow Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-amber-500/15 via-yellow-500/10 to-emerald-500/15 rounded-full blur-[150px] pointer-events-none animate-pulse" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0c121e]/90 via-[#080d17]/95 to-[#04070d] border border-amber-500/40 rounded-[36px] p-6 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-center space-y-6 overflow-hidden">
        {/* Top Security Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold shadow-lg shadow-emerald-500/15">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% P2P Direct Bank Settlement</span>
        </div>

        {/* ========================================================
            THE SACRED ROTATING CHAKRA & ULTRAPAY LOGO LOCKUP
            "uske charo or gol gol gumne wala chakr chle"
           ======================================================== */}
        <div className="relative flex items-center justify-center py-6 my-2">
          {/* Layer 1: Outermost Radiant Aura Glow */}
          <div className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-amber-500/25 via-yellow-400/15 to-emerald-400/25 blur-2xl pointer-events-none animate-pulse" />

          {/* Layer 2: Outermost Counter-Clockwise Cosmic Orbital Ring with Glowing Energy Nodes */}
          <div className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-dashed border-amber-400/40 animate-chakra-reverse pointer-events-none">
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_14px_#f59e0b]" />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_14px_#10b981]" />
            <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-yellow-300 shadow-[0_0_10px_#ffd700]" />
            <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          </div>

          {/* Layer 3: Golden Sacred Chakra Wheel with 24 Sacred Spokes (Clockwise Spinning) */}
          <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-amber-400/60 shadow-[0_0_35px_rgba(245,158,11,0.45)] animate-chakra-spin pointer-events-none flex items-center justify-center">
            {/* SVG Chakra Wheel 24 Spokes */}
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full text-amber-400/50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
              <circle cx="100" cy="100" r="82" stroke="currentColor" strokeWidth="1.2" />
              {/* 24 Sacred Rays of Chakra */}
              {Array.from({ length: 24 }).map((_, i) => (
                <line
                  key={i}
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="10"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  transform={`rotate(${i * 15} 100 100)`}
                  strokeLinecap="round"
                  className="text-amber-400/70"
                />
              ))}
              {/* Decorative Golden Nodes on Chakra Perimeter */}
              {Array.from({ length: 12 }).map((_, i) => (
                <circle
                  key={i}
                  cx="100"
                  cy="12"
                  r="3"
                  fill="#fcd34d"
                  transform={`rotate(${i * 30} 100 100)`}
                />
              ))}
            </svg>
          </div>

          {/* Layer 4: Inner Concentric Fast Pulsing Chakra Energy Orbit */}
          <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.35)] animate-chakra-reverse pointer-events-none">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047]" />
          </div>

          {/* Layer 5: Center UltraPay Logo (24K Gold & Emerald Fintech Emblem) */}
          <div className="relative z-20 flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#080d16]/95 border-2 border-amber-400/70 shadow-[0_0_30px_rgba(223,169,56,0.6)]">
            <UltraPayLogo size="xl" variant="vertical" showText={false} showSubtitle={false} />
          </div>
        </div>

        {/* UltraPay Brand Title & Official Tagline in Prominent Typography */}
        <div className="space-y-2 pt-1 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <span className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)]">
              Ultra<span className="bg-gradient-to-r from-[#FFF4CC] via-[#F59E0B] to-[#D97706] bg-clip-text text-transparent">Pay</span>
            </span>
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-500/20">
              Instant P2P
            </span>
          </div>

          {/* Official Tagline Required by User */}
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-emerald-500/10 border border-amber-500/30 shadow-inner">
            <p className="text-sm sm:text-base font-display font-bold text-amber-300 tracking-wide drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]">
              &ldquo;Har Second Settlement, Seedha Bank Account Mein.&rdquo;
            </p>
          </div>
        </div>

        {/* Dynamic Status Progress Indicator */}
        <div className="space-y-2 bg-[#060a12] border border-[#1a2336] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-slate-200 font-medium">{phaseText}</span>
            </span>
            <span className="text-amber-400 font-bold tabular-nums">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar with Glowing Shimmer */}
          <div className="w-full h-2 rounded-full bg-[#111724] overflow-hidden border border-slate-800 relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300 relative shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_1.5s_infinite]" />
            </div>
          </div>

          {/* Order Details Mini Pill */}
          <div className="pt-2 grid grid-cols-2 gap-2 text-left font-mono text-[11px] border-t border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[10px]">PAYABLE AMOUNT</span>
              <span className="font-bold text-emerald-400 text-sm">
                ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px]">BENEFICIARY</span>
              <span className="font-bold text-slate-200 truncate block">
                {beneficiaryName}
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Manual Action / Cancel */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onManualProceed) {
                onManualProceed();
              } else if (targetPaymentUrl) {
                window.location.href = targetPaymentUrl;
              }
            }}
            className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
          >
            <span>Proceed to UPI Payment Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer border border-slate-800"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-[10px] text-slate-500 font-mono">
          🔒 Secured by UltraPay Realtime Settlement Engine. UPI PIN is only entered on your verified bank app.
        </p>
      </div>
    </div>
  );
};
