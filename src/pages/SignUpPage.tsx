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
  Loader2
} from 'lucide-react';
import { supabase, validateReferralCode } from '../lib/supabase';
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

  // User Registration
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

      // Supabase Auth registration
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

      showToast('success', 'Account Created!', 'Welcome to UltraPay. Redirecting to login...');
      
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
        {/* Normal Partner Registration Form */}
        <div className="bg-[#0b0e14]/95 backdrop-blur-2xl py-8 px-6 sm:px-10 rounded-[28px] border border-[#1e2533] shadow-2xl shadow-black/80">
          <div className="text-center mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
              Partner Registration
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Join the revolution
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sponsor / Referral Code (TOP OF FORM) */}
            <div className="p-3.5 rounded-2xl bg-[#0e1422] border border-amber-500/40 shadow-md shadow-amber-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#e5a93c] font-mono">
                  SPONSOR / REFERRAL CODE
                </label>
                <span className="text-[10px] font-mono text-slate-400">Step 1: Verify Sponsor</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <input
                  type="text"
                  value={sponsorCode}
                  onChange={(e) => setSponsorCode(e.target.value.toUpperCase())}
                  placeholder="Referral ID"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#070b14] border border-[#212a3d] focus:border-[#e5a93c] text-white placeholder-slate-500 text-sm uppercase font-mono focus:outline-none transition-all font-semibold tracking-wide"
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
                <p className="text-xs text-emerald-400 pl-1 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 inline text-emerald-400" />
                  Sponsor Verified: <strong className="text-white">{sponsorName}</strong>
                </p>
              )}
              {sponsorValid === false && sponsorError && (
                <p className="text-xs text-rose-400 pl-1 font-mono">
                  {sponsorError}
                </p>
              )}
            </div>

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
                <div className={`flex items-center gap-2 ${passwordChecks.length ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.length ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                    {passwordChecks.length && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                  </div>
                  <span>Min 9 Chars</span>
                </div>

                <div className={`flex items-center gap-2 ${passwordChecks.hasUpper ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.hasUpper ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                    {passwordChecks.hasUpper && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                  </div>
                  <span>Uppercase</span>
                </div>

                <div className={`flex items-center gap-2 ${passwordChecks.hasLower ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.hasLower ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                    {passwordChecks.hasLower && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                  </div>
                  <span>Lowercase</span>
                </div>

                <div className={`flex items-center gap-2 ${passwordChecks.hasNumber ? 'text-[#e5a93c]' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${passwordChecks.hasNumber ? 'border-[#e5a93c] bg-[#e5a93c]/20' : 'border-slate-600'}`}>
                    {passwordChecks.hasNumber && <div className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />}
                  </div>
                  <span>Number</span>
                </div>

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
      </div>
    </div>
  );
};
