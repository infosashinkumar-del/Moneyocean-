import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

interface LoginPageProps {
  onNavigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { refreshUserData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      showToast('error', 'Missing Fields', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      // 1. Strictly authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      // 2. If authentication fails, display error and do NOT set session or redirect
      if (error || !data?.user) {
        const message = 'Invalid email or password';
        setErrorMsg(message);
        showToast('error', 'Authentication Failed', message);
        setLoading(false);
        return;
      }

      // 3. On successful auth, fetch user profile from public.users using data.user.id
      const userId = data.user.id;
      const { data: dbUser, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.warn('Profile fetch note:', profileErr);
      }

      // Refresh auth context with verified user profile & dashboard data
      await refreshUserData();

      showToast('success', 'Logged in successfully', 'Welcome back to MoneyOcean!');
      setTimeout(() => {
        onNavigate('dashboard');
      }, 300);
    } catch (err: any) {
      console.error('Login error:', err);
      const message = 'Invalid email or password';
      setErrorMsg(message);
      showToast('error', 'Authentication Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] gold-stars-bg flex flex-col justify-start sm:justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-[#e5a93c] selection:text-slate-950">
      {/* Top ambient gold glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-amber-500/10 blur-[100px] pointer-events-none" />

      {/* Back to Home Button */}
      <div className="w-full max-w-md mx-auto mb-4 sm:mb-6 relative z-20">
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors cursor-pointer group py-1.5"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Main Card */}
        <div className="bg-[#0b0e14]/95 backdrop-blur-2xl py-8 px-6 sm:px-10 rounded-[28px] border border-[#1e2533] shadow-2xl shadow-black/80">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Access your partner dashboard
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-500/30 flex items-start gap-3 text-sm text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sign In Error</p>
                <p className="text-xs text-rose-300/90 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono mb-2">
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
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-[#111622] border border-[#212a3d] focus:border-[#e5a93c] text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono mb-2">
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
                  className="w-full pl-10 pr-11 py-3.5 rounded-xl bg-[#111622] border border-[#212a3d] focus:border-[#e5a93c] text-white placeholder-slate-500 text-sm focus:outline-none transition-all font-mono"
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

            {/* Login Dashboard Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl gold-btn-gradient font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login Dashboard</span>
              )}
            </button>
          </form>

          {/* Switch to signup */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <button
                onClick={() => onNavigate('signup')}
                className="text-[#e5a93c] hover:text-[#f3c64c] font-bold cursor-pointer transition-colors"
              >
                Register Now
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

