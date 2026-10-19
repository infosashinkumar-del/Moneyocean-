import React, { useState, useEffect } from 'react';
import { Clock, Lock, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export const TARGET_LAUNCH_ISO = '2026-10-27T20:00:00+05:30';

export interface TimeLeft {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

// Platform Launch Mode Toggle: Set to true per user request so user can test and sign up now!
export const IS_PLATFORM_LAUNCHED = true;

export function calculateTimeLeft(targetIso: string = TARGET_LAUNCH_ISO): TimeLeft {
  if (IS_PLATFORM_LAUNCHED) {
    return { totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }

  try {
    const target = new Date(targetIso).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0 || isNaN(diff)) {
      return { totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { totalSeconds, days, hours, minutes, seconds, isComplete: false };
  } catch {
    return { totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }
}

export function useLaunchCountdown(targetIso: string = TARGET_LAUNCH_ISO) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetIso));

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetIso));

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetIso));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetIso]);

  return timeLeft;
}

export const LaunchBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  if (IS_PLATFORM_LAUNCHED) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950/90 via-[#0d1c16] to-emerald-950/90 text-amber-200 border border-amber-500/40 text-[11px] font-mono font-bold shadow-md shadow-emerald-500/10 ${className}`}>
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
      <span>🚀 Launching 27 Oct, 8:00 PM IST</span>
    </span>
  );
};

interface LaunchCountdownTimerProps {
  targetDate?: string;
  variant?: 'button-hero' | 'button-nav' | 'blocker-card' | 'button-signup-submit' | 'glowing-gold-emerald';
  onNavigate?: (route: string) => void;
}

export const LaunchCountdownTimer: React.FC<LaunchCountdownTimerProps> = ({
  targetDate = TARGET_LAUNCH_ISO,
  variant = 'button-hero',
  onNavigate
}) => {
  const timeLeft = useLaunchCountdown(targetDate);
  const formatDigit = (num: number) => String(num).padStart(2, '0');

  // If countdown is finished, return null so parent component can render the standard button
  if (timeLeft.isComplete) {
    return null;
  }

  // Glowing Gold & Emerald Full Card / Banner
  if (variant === 'glowing-gold-emerald') {
    return (
      <div className="w-full max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#0a1215] to-emerald-950/40 border border-amber-500/40 p-5 sm:p-6 shadow-[0_0_35px_rgba(245,158,11,0.15)] ring-1 ring-emerald-500/30 backdrop-blur-xl relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10 text-center sm:text-left">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>🚀 Launching 27 Oct, 8:00 PM IST</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight">
              Official Global Launch Countdown
            </h4>
            <p className="text-xs text-slate-300 font-mono">
              Live peer-to-peer UPI settlements commence automatically at countdown completion.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 shrink-0">
            {[
              { label: 'DAYS', val: timeLeft.days },
              { label: 'HOURS', val: timeLeft.hours },
              { label: 'MINUTES', val: timeLeft.minutes },
              { label: 'SECONDS', val: timeLeft.seconds }
            ].map((item, idx) => (
              <div key={idx} className="p-2 sm:p-2.5 rounded-xl bg-[#080d15] border border-amber-500/30 text-center min-w-[56px] sm:min-w-[64px] shadow-inner shadow-black/60">
                <div className="text-lg sm:text-2xl font-black font-mono text-amber-300 tabular-nums">
                  {formatDigit(item.val)}
                </div>
                <div className="text-[8px] sm:text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Navbar Button Replacement
  if (variant === 'button-nav') {
    return (
      <div 
        title="Official Launch on October 27, 2026 at 08:00 PM IST"
        className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-950/70 via-[#101522] to-amber-950/70 border border-amber-500/40 text-amber-300 font-mono text-xs shadow-md shadow-amber-500/10 select-none cursor-default"
      >
        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
        <span className="text-[10px] text-amber-200 uppercase font-bold hidden sm:inline">Launch:</span>
        <span className="font-bold text-white tabular-nums tracking-tight">
          {timeLeft.days}d {formatDigit(timeLeft.hours)}h {formatDigit(timeLeft.minutes)}m {formatDigit(timeLeft.seconds)}s
        </span>
      </div>
    );
  }

  // Signup Submit Button Replacement
  if (variant === 'button-signup-submit') {
    return (
      <div 
        title="Official Launch: October 27, 2026 at 08:00 PM IST. Registrations open when countdown hits zero."
        className="w-full py-4 px-4 sm:px-5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-[#0e131f] to-amber-950/90 border border-amber-500/50 shadow-xl shadow-amber-500/10 text-white font-mono select-none flex flex-col sm:flex-row items-center justify-between gap-3 mt-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Launch Countdown Active</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Registrations Open: Oct 27, 2026, 8:00 PM IST
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 font-black text-xs sm:text-sm tabular-nums text-white">
          <span className="bg-[#070b14] px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300">
            {formatDigit(timeLeft.days)}d
          </span>
          <span className="text-amber-400 font-bold">:</span>
          <span className="bg-[#070b14] px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300">
            {formatDigit(timeLeft.hours)}h
          </span>
          <span className="text-amber-400 font-bold">:</span>
          <span className="bg-[#070b14] px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300">
            {formatDigit(timeLeft.minutes)}m
          </span>
          <span className="text-amber-400 font-bold">:</span>
          <span className="bg-amber-500/25 px-2 py-1 rounded-lg border border-amber-400/60 text-amber-200 animate-pulse">
            {formatDigit(timeLeft.seconds)}s
          </span>
        </div>
      </div>
    );
  }

  // Full Page Blocker Card for /signup route
  if (variant === 'blocker-card') {
    return (
      <div className="w-full max-w-lg mx-auto bg-[#0b0e14]/95 backdrop-blur-2xl py-8 px-6 sm:px-10 rounded-[28px] border border-amber-500/40 shadow-2xl shadow-black/90 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>REGISTRATION CURRENTLY LOCKED</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Launch Countdown Active
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            New user registrations will open immediately once the countdown reaches zero on{' '}
            <strong className="text-amber-300">October 27, 2026 at 08:00 PM IST</strong>.
          </p>
        </div>

        {/* 4 Digit Boxes */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 py-2">
          {[
            { label: 'DAYS', val: timeLeft.days },
            { label: 'HOURS', val: timeLeft.hours },
            { label: 'MINUTES', val: timeLeft.minutes },
            { label: 'SECONDS', val: timeLeft.seconds }
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-[#080d16] border border-amber-500/30">
              <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
                {formatDigit(item.val)}
              </div>
              <div className="text-[9px] font-mono font-bold text-amber-400 mt-1 uppercase tracking-wider">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('landing')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#111722] hover:bg-[#182132] border border-[#212c40] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <span>Existing Member Sign In</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Hero / Section Button Replacement (Default)
  return (
    <div 
      title="Official Launch: October 27, 2026 at 08:00 PM IST. Registration unlocks at zero."
      className="inline-flex items-center gap-2 sm:gap-3 px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-[#10141f] to-amber-950/90 border border-amber-500/50 shadow-xl shadow-amber-500/15 text-white font-mono select-none"
    >
      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm shrink-0">
        <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
        <span className="text-[11px] uppercase tracking-wider text-amber-300 font-extrabold">Launch in:</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 font-black text-sm sm:text-base tabular-nums text-white">
        <span className="bg-[#090d16] px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300 shadow-inner">
          {formatDigit(timeLeft.days)}d
        </span>
        <span className="text-amber-400 font-bold">:</span>
        <span className="bg-[#090d16] px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300 shadow-inner">
          {formatDigit(timeLeft.hours)}h
        </span>
        <span className="text-amber-400 font-bold">:</span>
        <span className="bg-[#090d16] px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300 shadow-inner">
          {formatDigit(timeLeft.minutes)}m
        </span>
        <span className="text-amber-400 font-bold">:</span>
        <span className="bg-amber-500/25 px-2 py-1 rounded-lg border border-amber-400/60 text-amber-200 shadow-inner animate-pulse">
          {formatDigit(timeLeft.seconds)}s
        </span>
      </div>
    </div>
  );
};
