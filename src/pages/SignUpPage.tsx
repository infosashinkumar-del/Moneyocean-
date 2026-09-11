import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Users, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  XCircle,
  Loader2,
  Clock,
  Sparkles,
  Calendar,
  Zap,
  ArrowRight,
  Timer
} from 'lucide-react';
import { supabase, validateReferralCode, getPlatformConfigs } from '../lib/supabase';
import { showToast } from '../components/Toast';

interface SignUpPageProps {
  onNavigate: (route: string) => void;
  prefilledReferralCode?: string;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate, prefilledReferralCode = '' }) => {
  const [sponsorCode, setSponsorCode] = useState(() => {
    return prefilledReferralCode || (typeof window !== 'undefined' ? sessionStorage.getItem('mo_sponsor_code') || '' : '');
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sponsor validation state
  const [validatingSponsor, setValidatingSponsor] = useState(false);
  const [sponsorValid, setSponsorValid] = useState<boolean | null>(null);
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [sponsorError, setSponsorError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Pre-Launch Countdown state
  const [checkingLaunch, setCheckingLaunch] = useState(true);
  const [isPreLaunch, setIsPreLaunch] = useState(false);
  const [launchDateStr, setLaunchDateStr] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Live password validation indicators (Min 9 Chars, Uppercase, Lowercase, Number, Special Char)
  const passwordChecks = {
    length: password.length >= 9,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[@$!%*?&#^()_+\-=[\]{}|;:,.<>]/.test(password),
  };

  const isPasswordValid = 
    passwordChecks.length &&
    passwordChecks.hasUpper &&
    passwordChecks.hasLower &&
    passwordChecks.hasNumber &&
    passwordChecks.hasSpecial;

  // 1. Dynamic check for platform_launch_date on mount
  useEffect(() => {
    let active = true;

    const checkLaunchStatus = async () => {
      try {
        // Query platform_configs for key = 'platform_launch_date'
        const { data, error } = await supabase
          .from('platform_configs')
          .select('value')
          .eq('key', 'platform_launch_date')
          .maybeSingle();

        let targetDateVal: string | null = null;
        if (!error && data?.value) {
          targetDateVal = typeof data.value === 'string' ? data.value : String(data.value);
        } else {
          // Fallback via helper
          const configs = await getPlatformConfigs();
          if (configs?.platform_launch_date) {
            targetDateVal = configs.platform_launch_date;
          }
        }

        if (!active) return;

        if (targetDateVal && targetDateVal.trim()) {
          const targetTimestamp = new Date(targetDateVal).getTime();
          if (!isNaN(targetTimestamp) && targetTimestamp > Date.now()) {
            setLaunchDateStr(targetDateVal);
            setIsPreLaunch(true);

            // Calculate initial remaining breakdown
            const diffMs = targetTimestamp - Date.now();
            const totalSec = Math.max(0, Math.floor(diffMs / 1000));
            const days = Math.floor(totalSec / 86400);
            const hours = Math.floor((totalSec % 86400) / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;
            setTimeLeft({ days, hours, minutes, seconds });
          } else {
            setIsPreLaunch(false);
          }
        } else {
          setIsPreLaunch(false);
        }
      } catch (err) {
        console.warn('Could not verify launch date config:', err);
        if (active) setIsPreLaunch(false);
      } finally {
        if (active) setCheckingLaunch(false);
      }
    };

    checkLaunchStatus();

    return () => {
      active = false;
    };
  }, []);

  // 2. Real-time 1-second countdown ticker with instant real-time auto-unlock
  useEffect(() => {
    if (!isPreLaunch || !launchDateStr) return;

    const targetTime = new Date(launchDateStr).getTime();
    if (isNaN(targetTime)) return;

    const intervalId = setInterval(() => {
      const diffMs = targetTime - Date.now();

      if (diffMs <= 0) {
        // Countdown reached zero: automatically unlock and display registration form without reload!
        setIsPreLaunch(false);
        clearInterval(intervalId);
        showToast('success', 'Launch Time Arrived!', 'Registration has unlocked in real-time. Welcome to MoneyOcean!');
      } else {
        const totalSec = Math.max(0, Math.floor(diffMs / 1000));
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isPreLaunch, launchDateStr]);

  // Sync prefilled referral code if changed
  useEffect(() => {
    if (prefilledReferralCode) {
      setSponsorCode(prefilledReferralCode);
    }
  }, [prefilledReferralCode]);

  // Real-time debounce sponsor validation (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = sponsorCode.trim();
    if (!trimmed) {
      setSponsorValid(null);
      setSponsorName(null);
      setSponsorError(null);
      setValidatingSponsor(false);
      return;
    }

    setValidatingSponsor(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await validateReferralCode(trimmed);
        if (res.valid) {
          setSponsorValid(true);
          setSponsorName(res.full_name || 'Verified Sponsor');
          setSponsorError(null);
        } else {
          setSponsorValid(false);
          setSponsorName(null);
          setSponsorError(res.message || 'Invalid referral code. Sponsor not found.');
        }
      } catch {
        setSponsorValid(false);
        setSponsorError('Error looking up referral code');
      } finally {
        setValidatingSponsor(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [sponsorCode]);

  // 3. User Registration (Clean Auth SignUp - database trigger handle_new_user creates user profile)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('error', 'Required Field', 'Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!isPasswordValid) {
      showToast('error', 'Weak Password', 'Password must meet all 5 security criteria (min 9 characters)');
      return;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Password Mismatch', 'Passwords do not match');
      return;
    }

    if (sponsorCode.trim() && sponsorValid === false) {
      showToast('error', 'Invalid Sponsor', 'Please enter a valid sponsor code or leave it blank');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanSponsor = sponsorCode.trim().toUpperCase() || null;

      // Supabase Auth registration with user metadata for PostgreSQL handle_new_user trigger
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            sponsor_code: cleanSponsor
          }
        }
      });

      if (error) {
        showToast('error', 'Registration Failed', error.message);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        showToast('error', 'Registration Failed', 'Could not create user credentials on server.');
        setLoading(false);
        return;
      }

      showToast('success', 'Account Created!', 'Welcome to MoneyOcean. Redirecting to login...');
      
      setTimeout(() => {
        onNavigate('login');
      }, 1200);

    } catch (err: any) {
      console.error('Sign up error:', err);
      showToast('error', 'Registration Error', err.message || 'An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] gold-stars-bg flex flex-col justify-start sm:justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-[#e5a93c] selection:text-slate-950">
      {/* Top ambient gold glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-amber-500/10 blur-[100px] pointer-events-none" />

      {/* Back to Home Button */}
      <div className="w-full max-w-lg mx-auto mb-4 sm:mb-6 relative z-20">
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors cursor-pointer group py-1.5"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="w-full max-w-lg mx-auto relative z-10">
        {/* Loading Launch Config State */}
        {checkingLaunch ? (
          <div className="bg-[#0b0e14]/95 backdrop-blur-2xl py-16 px-6 sm:px-10 rounded-[28px] border border-[#1e2533] shadow-2xl shadow-black/80 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-[#e5a93c] animate-spin" />
            <p className="text-xs font-mono tracking-wider text-slate-400">Verifying Platform Launch Status...</p>
          </div>
        ) : isPreLaunch && launchDateStr ? (
          /* ========================================================================= */
          /* Dynamic Pre-Launch Countdown Screen (Dark-Gold Premium Fintech Theme)    */
          /* ========================================================================= */
          <div className="bg-[#0b0e14]/95 backdrop-blur-2xl py-8 sm:py-10 px-6 sm:px-10 rounded-[28px] border border-[#1e2533] shadow-2xl shadow-black/80 relative overflow-hidden text-center space-y-6">
            {/* Ambient inner radiance */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 bg-amber-500/15 blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold tracking-wide shadow-lg shadow-amber-950/40">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>PRE-LAUNCH PHASE IN PROGRESS</span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-white tracking-tight">
                Grand Protocol Launch
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                MoneyOcean is finalizing deployment of the decentralized P2P affiliate protocol. Registration will unlock automatically when the counter hits zero.
              </p>
            </div>

            {/* Live 4-Column Countdown Grid */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 my-6">
              {/* Days */}
              <div className="p-3 sm:p-4 rounded-2xl bg-[#080b11] border border-[#1d2638] shadow-inner flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-4xl font-extrabold font-mono text-white gold-gradient-text tracking-tight tabular-nums">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-1">
                  DAYS
                </span>
              </div>

              {/* Hours */}
              <div className="p-3 sm:p-4 rounded-2xl bg-[#080b11] border border-[#1d2638] shadow-inner flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-4xl font-extrabold font-mono text-white gold-gradient-text tracking-tight tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-1">
                  HOURS
                </span>
              </div>

              {/* Minutes */}
              <div className="p-3 sm:p-4 rounded-2xl bg-[#080b11] border border-[#1d2638] shadow-inner flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-4xl font-extrabold font-mono text-white gold-gradient-text tracking-tight tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-1">
                  MINS
                </span>
              </div>

              {/* Seconds */}
              <div className="p-3 sm:p-4 rounded-2xl bg-[#080b11] border border-amber-500/40 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
                <span className="text-2xl sm:text-4xl font-extrabold font-mono text-amber-400 tracking-tight tabular-nums">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300/80 mt-1">
                  SECS
                </span>
                <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </div>
            </div>

            {/* Launch Timestamp Details */}
            <div className="p-3.5 rounded-2xl bg-[#090d16] border border-[#1a2335] text-xs font-mono text-slate-300 space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-[#e5a93c]" />
                <span>Scheduled Launch Date & Time:</span>
              </div>
              <div className="text-amber-300 font-bold text-xs sm:text-sm">
                {new Date(launchDateStr).toLocaleString(undefined, {
                  dateStyle: 'full',
                  timeStyle: 'medium'
                })}
              </div>
            </div>

            {/* Preserved Sponsor Notice if applicable */}
            {sponsorCode && (
              <div className="p-3 rounded-xl bg-[#070b12] border border-emerald-500/25 flex items-center justify-between text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Sponsor Locked:</span>
                </div>
                <span className="font-bold text-white tracking-wide">#{sponsorCode.toUpperCase()}</span>
              </div>
            )}

            {/* Live Synchronizer Banner */}
            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Sync Active • Auto-unlocks at 00:00:00</span>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#1a2335] flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigate('landing')}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-[#111724] hover:bg-[#161f30] border border-[#23314d] text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Explore Platform
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Genesis Node Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* Normal Partner Registration Form                                          */
          /* ========================================================================= */
          <div className="bg-[#0b0e14]/95 backdrop-blur-2xl py-8 px-6 sm:px-10 rounded-[28px] border border-[#1e2533] shadow-2xl shadow-black/80">
            
            {/* Header */}
            <div className="text-center mb-7">
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
                Partner Registration
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Join the revolution
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono mb-1.5">
                  FULL NAME
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111622] border border-[#212a3d] focus:border-[#e5a93c] text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono mb-1.5">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111622] border border-[#212a3d] focus:border-[#e5a93c] text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#111622] border border-[#212a3d] focus:border-[#e5a93c] text-white placeholder-slate-500 text-sm focus:outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Security Criteria */}
              <div className="p-3 rounded-xl bg-[#0e131d]/90 border border-[#1d2535] space-y-2">
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-medium">
                  {/* Min 9 Chars */}
                  <div className={`flex items-center gap-2 ${passwordChecks.length ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.length ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                      {passwordChecks.length && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                    </div>
                    <span>Min 9 Chars</span>
                  </div>

                  {/* Uppercase */}
                  <div className={`flex items-center gap-2 ${passwordChecks.hasUpper ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.hasUpper ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                      {passwordChecks.hasUpper && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                    </div>
                    <span>Uppercase</span>
                  </div>

                  {/* Lowercase */}
                  <div className={`flex items-center gap-2 ${passwordChecks.hasLower ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.hasLower ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                      {passwordChecks.hasLower && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                    </div>
                    <span>Lowercase</span>
                  </div>

                  {/* Number */}
                  <div className={`flex items-center gap-2 ${passwordChecks.hasNumber ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.hasNumber ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                      {passwordChecks.hasNumber && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                    </div>
                    <span>Number</span>
                  </div>

                  {/* Special Char */}
                  <div className={`flex items-center gap-2 col-span-2 ${passwordChecks.hasSpecial ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.hasSpecial ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                      {passwordChecks.hasSpecial && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                    </div>
                    <span>Special Char (!@#...)</span>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono mb-1.5">
                  CONFIRM PASSWORD
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#111622] border border-[#212a3d] focus:border-[#e5a93c] text-white placeholder-slate-500 text-sm focus:outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sponsor Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#e5a93c] font-mono mb-1.5">
                  SPONSOR CODE
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={sponsorCode}
                    onChange={(e) => setSponsorCode(e.target.value.toUpperCase())}
                    placeholder="Referral ID"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#111622] border border-[#212a3d] focus:border-[#e5a93c] text-white placeholder-slate-500 text-sm uppercase font-mono focus:outline-none transition-all"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {validatingSponsor && <Loader2 className="w-4 h-4 text-[#e5a93c] animate-spin" />}
                    {!validatingSponsor && sponsorValid === true && (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                    {!validatingSponsor && sponsorValid === false && (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                </div>
                {sponsorValid === true && sponsorName && (
                  <p className="text-xs text-emerald-400 mt-1 pl-1">
                    Sponsor Verified: <strong className="text-white">{sponsorName}</strong>
                  </p>
                )}
                {sponsorValid === false && sponsorError && (
                  <p className="text-xs text-rose-400 mt-1 pl-1">
                    {sponsorError}
                  </p>
                )}
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={loading || !isPasswordValid || password !== confirmPassword}
                className="w-full py-4 rounded-xl gold-btn-gradient font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            {/* Switch to login */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Already have an ID?{' '}
                <button
                  onClick={() => onNavigate('login')}
                  className="text-[#e5a93c] hover:text-[#f3c64c] font-bold cursor-pointer transition-colors"
                >
                  Login Here
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
