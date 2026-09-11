import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User as UserIcon, 
  Lock, 
  Check, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Zap,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, getUserMerchantKeys, saveUserMerchantKey } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { UserMerchantKey } from '../types';

interface ProfileSettingsProps {
  onUnlockAdmin?: () => void;
  adminUnlocked?: boolean;
  onNavigate?: (tab: string) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  onNavigate 
}) => {
  const { user, authUser, refreshUserData, isAdmin, packagePrice } = useAuth();
  const unitPrice = packagePrice || 5000;

  // Profile Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [updatingName, setUpdatingName] = useState(false);

  // ZapKey Form
  const [zapKey, setZapKey] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantKeys, setMerchantKeys] = useState<UserMerchantKey[]>([]);
  const [savingKey, setSavingKey] = useState(false);

  // Change Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
    if (user?.id) {
      loadMerchantKeys();
    }
  }, [user]);

  const loadMerchantKeys = async () => {
    if (!user?.id) return;
    const keys = await getUserMerchantKeys(user.id);
    setMerchantKeys(keys);
    if (keys.length > 0) {
      setZapKey(keys[0].zap_key);
      setMerchantName(keys[0].paytm_merchant_name || '');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !fullName.trim()) return;

    setUpdatingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      await refreshUserData();
      showToast('success', 'Profile Updated', 'Your full name has been updated.');
    } catch (err: any) {
      console.error('Update profile error:', err);
      showToast('error', 'Update Failed', err.message || 'Could not update profile in database.');
    } finally {
      setUpdatingName(false);
    }
  };

  const handleSaveZapKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!zapKey.trim()) {
      showToast('error', 'Key Required', 'Please enter your valid ZapKey from your ZapUPI dashboard');
      return;
    }

    setSavingKey(true);
    try {
      const res = await saveUserMerchantKey(user.id, zapKey, merchantName);
      if (res.success) {
        await loadMerchantKeys();
        showToast('success', 'ZapKey Saved', 'Merchant key is now active to receive P2P payouts!');
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      showToast('error', 'Failed to save ZapKey', err.message);
    } finally {
      setSavingKey(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      showToast('error', 'Weak Password', 'Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password Changed', 'Your password has been updated securely.');
    } catch (err: any) {
      showToast('error', 'Change Failed', err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const activeKey = merchantKeys[0];
  const monthlyLimit = activeKey?.monthly_limit || 75000;
  const receivedAmount = activeKey?.monthly_received_amount || 0;
  const usagePercent = Math.min(100, Math.round((Number(receivedAmount) / Number(monthlyLimit)) * 100));

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b0f19] via-[#101726] to-[#07090e] border border-[#1e2a40] shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Profile & Settlement Settings</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Account Management & ZapKey
          </h2>
          <p className="text-sm text-slate-300">
            Configure your profile details, manage your ZapUPI merchant key for instant P2P payout settlements, and control security.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Col 1: ZapKey Merchant Key Configuration */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#091122]/70 backdrop-blur-xl border border-emerald-500/20 shadow-xl space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                P2P Settlement Gateway
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-semibold">
                ZapUPI Connected
              </span>
            </div>
            <h3 className="text-xl font-bold font-display text-white mt-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>ZapKey Payout Receiver</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Your merchant key from zapupi.com used to route incoming ₹{unitPrice.toLocaleString('en-IN')} peer-to-peer buyer payments directly to your UPI ID.
            </p>
          </div>

          {/* Monthly Received Volume Progress Bar */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Monthly Volume Used:</span>
              <span className="font-bold text-emerald-300">
                ₹{Number(receivedAmount).toLocaleString('en-IN')} / ₹{Number(monthlyLimit).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="w-full bg-[#091122] h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>{usagePercent}% of ₹75k limit</span>
              <span>Resets every calendar month</span>
            </div>
          </div>

          <form onSubmit={handleSaveZapKey} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                Merchant ZapKey
              </label>
              <input
                type="text"
                value={zapKey}
                onChange={(e) => setZapKey(e.target.value)}
                placeholder="zap_live_••••••••••••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-500 text-slate-100 font-mono text-xs placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                Merchant Business Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="e.g. My Business Store"
                className="w-full px-4 py-3 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-500 text-slate-100 text-xs placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={savingKey}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {savingKey ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Merchant Key...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Update P2P Settlement Key</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Col 2: Profile & Password Management */}
        <div className="space-y-8">
          {/* Profile Name */}
          <div className="p-6 rounded-3xl bg-[#091122]/70 backdrop-blur-xl border border-emerald-500/15 shadow-xl space-y-4">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-400" />
              <span>Personal Information</span>
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-500 text-slate-100 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                  Email Address (Fixed)
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.email || authUser?.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050811]/60 border border-slate-900 text-slate-400 text-xs focus:outline-none cursor-not-allowed font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={updatingName}
                className="px-5 py-2.5 rounded-xl bg-[#050811] hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
              >
                {updatingName ? 'Saving...' : 'Update Name'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="p-6 rounded-3xl bg-[#091122]/70 backdrop-blur-xl border border-emerald-500/15 shadow-xl space-y-4">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Change Password</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-500 text-slate-100 text-xs pr-10 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-500 text-slate-100 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="px-5 py-2.5 rounded-xl bg-[#050811] hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
              >
                {changingPassword ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          </div>

          {/* Master Admin Portal Box - Only visible to verified Administrators */}
          {isAdmin && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#0d091e]/60 to-purple-950/40 backdrop-blur-xl border border-purple-500/40 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-display text-purple-200 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-purple-400" />
                  <span>Master Admin Portal Controls</span>
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-bold uppercase">
                  ADMIN VERIFIED
                </span>
              </div>

              <p className="text-xs text-purple-200/80 leading-relaxed">
                You are logged in as an authorized Platform Master Administrator. You have full oversight over all global network volumes, user node activations, and peer ledger audits.
              </p>

              <button
                type="button"
                onClick={() => onNavigate?.('admin')}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Launch Master Admin Portal & Global Ledger</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
