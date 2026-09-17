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
  ShieldAlert,
  Plus,
  Trash2,
  Power,
  Scale,
  Sparkles,
  Copy,
  Layers,
  X,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Link2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  supabase, 
  getUserMerchantKeys, 
  saveUserMerchantKey,
  deleteUserMerchantKey,
  toggleUserMerchantKeyStatus 
} from '../lib/supabase';
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
  const { user, authUser, refreshUserData, isAdmin, packagePrice, platformConfig } = useAuth();
  const unitPrice = packagePrice;

  // Profile Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [updatingName, setUpdatingName] = useState(false);

  // ZapUPI Webhook URL state
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const activeWebhookUrl = platformConfig?.webhook_url || 'https://moneyocean-webhook-shield.moneyocean.workers.dev';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(activeWebhookUrl);
    setCopiedWebhook(true);
    showToast('success', 'Webhook URL Copied!', 'Apne ZapUPI merchant panel me paste karein.');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Multi-ZapKey Load Balancer Form & State
  const [merchantKeys, setMerchantKeys] = useState<UserMerchantKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newZapKey, setNewZapKey] = useState('');
  const [newMerchantName, setNewMerchantName] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

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
    setLoadingKeys(true);
    try {
      const keys = await getUserMerchantKeys(user.id);
      setMerchantKeys(keys);
    } catch (err) {
      console.error('Error loading merchant keys:', err);
    } finally {
      setLoadingKeys(false);
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

  const handleAddZapKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const trimmedKey = newZapKey.trim();
    if (!trimmedKey) {
      showToast('error', 'Key Required', 'Please enter your valid ZapKey from zapupi.com');
      return;
    }

    setSavingKey(true);
    try {
      const res = await saveUserMerchantKey(user.id, trimmedKey, newMerchantName.trim());
      if (res.success) {
        setNewZapKey('');
        setNewMerchantName('');
        setShowAddForm(false);
        await loadMerchantKeys();
        showToast('success', 'ZapKey Registered', 'Merchant key added to your load balancer cluster.');
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      showToast('error', 'Failed to register ZapKey', err.message || 'Could not save ZapKey');
    } finally {
      setSavingKey(false);
    }
  };

  const handleToggleKey = async (keyItem: UserMerchantKey) => {
    if (actionLoadingId) return;
    const nextStatus = !keyItem.is_active;

    // Immediate optimistic state update
    setMerchantKeys(prev =>
      prev.map(k => (k.id === keyItem.id ? { ...k, is_active: nextStatus } : k))
    );
    setActionLoadingId(keyItem.id);

    try {
      const res = await toggleUserMerchantKeyStatus(keyItem.id, nextStatus);
      if (res.success) {
        showToast(
          nextStatus ? 'success' : 'info',
          nextStatus ? 'ZapKey Activated' : 'ZapKey Paused',
          nextStatus 
            ? `${keyItem.paytm_merchant_name || 'ZapKey'} is active and receiving P2P payments.`
            : `${keyItem.paytm_merchant_name || 'ZapKey'} has been paused from rotation.`
        );
      } else {
        // Rollback on failure
        setMerchantKeys(prev =>
          prev.map(k => (k.id === keyItem.id ? { ...k, is_active: keyItem.is_active } : k))
        );
        throw new Error(res.message);
      }
    } catch (err: any) {
      // Rollback on exception
      setMerchantKeys(prev =>
        prev.map(k => (k.id === keyItem.id ? { ...k, is_active: keyItem.is_active } : k))
      );
      showToast('error', 'Status Update Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteKey = async (keyItem: UserMerchantKey) => {
    if (actionLoadingId) return;

    const confirmed = window.confirm('Delete this ZapKey?');
    if (!confirmed) {
      return;
    }

    const previousKeys = [...merchantKeys];
    // Immediate optimistic removal from local state list
    setMerchantKeys(prev => prev.filter(k => k.id !== keyItem.id));
    setActionLoadingId(keyItem.id);

    try {
      const res = await deleteUserMerchantKey(keyItem.id);
      if (res.success) {
        showToast('success', 'ZapKey Deleted', 'The merchant key has been removed from your load balancer.');
      } else {
        // Rollback on error
        setMerchantKeys(previousKeys);
        throw new Error(res.message);
      }
    } catch (err: any) {
      // Rollback on exception
      setMerchantKeys(previousKeys);
      showToast('error', 'Delete Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyKey = (keyItem: UserMerchantKey) => {
    navigator.clipboard.writeText(keyItem.zap_key);
    setCopiedKeyId(keyItem.id);
    showToast('info', 'Copied to Clipboard', 'ZapKey copied successfully.');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const maskZapKey = (keyStr: string) => {
    if (!keyStr) return '••••••••••••';
    const trimmed = keyStr.trim();
    if (trimmed.length <= 10) return '••••' + trimmed.slice(-4);
    const prefix = trimmed.startsWith('zap_live_') ? 'zap_live_' : trimmed.slice(0, 8);
    const suffix = trimmed.slice(-4);
    return `${prefix}...${suffix}`;
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

  // Identify lowest volume active key for Least-Loaded Load Balancing
  const activeKeys = merchantKeys.filter(k => k.is_active);
  const lowestVolumeKey = activeKeys.length > 0 
    ? [...activeKeys].sort((a, b) => {
        const volA = Number(a.monthly_received_amount || 0);
        const volB = Number(b.monthly_received_amount || 0);
        if (volA !== volB) return volA - volB;
        return (a.priority_order || 0) - (b.priority_order || 0);
      })[0]
    : null;

  const totalMonthlyVolume = merchantKeys.reduce((acc, k) => acc + Number(k.monthly_received_amount || 0), 0);
  const totalCombinedLimit = merchantKeys.reduce((acc, k) => acc + Number(k.monthly_limit || 75000), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b0f19] via-[#101726] to-[#07090e] border border-[#1e2a40] shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Profile & Settlement Settings</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Account Management & Multi-ZapKey Load Balancer
          </h2>
          <p className="text-sm text-slate-300">
            Configure your personal credentials, register multiple ZapUPI merchant keys for automated least-loaded load balancing, and control settlement security.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Col 1: Multi-ZapKey Load Balancer Manager (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#091122]/70 backdrop-blur-xl border border-emerald-500/20 shadow-xl space-y-6">
            
            {/* Header with Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c273e] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                    P2P Settlement Gateway
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Cluster</span>
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display text-white mt-1 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <span>Multi-ZapKey Load Balancer</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Route incoming ₹{unitPrice.toLocaleString('en-IN')} direct UPI payments across multiple ZapUPI merchant keys.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                {showAddForm ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Close Form</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Additional ZapKey</span>
                  </>
                )}
              </button>
            </div>

            {/* Informational Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0a1622] to-amber-950/30 border border-emerald-500/30 shadow-lg flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
                <Scale className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Smart Load-Balancing</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-slate-300 leading-relaxed text-[11.5px]">
                  Calendar Month Auto-Reset: Volume automatically resets to ₹0 on the 1st of every month at 00:00 AM. Payments route to the active key with the lowest volume in the current calendar month.
                </p>
              </div>
            </div>

            {/* Cluster Stats Overview */}
            {merchantKeys.length > 0 && (
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#050811] border border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Active / Total
                  </span>
                  <p className="text-sm sm:text-base font-bold font-mono text-emerald-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{activeKeys.length} / {merchantKeys.length}</span>
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Cluster Volume
                  </span>
                  <p className="text-sm sm:text-base font-bold font-mono text-white">
                    ₹{totalMonthlyVolume.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Total Capacity
                  </span>
                  <p className="text-sm sm:text-base font-bold font-mono text-amber-300">
                    ₹{totalCombinedLimit.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}

            {/* ZapUPI Webhook URL Setup Block */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#0c1017] border border-cyan-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Link2 className="w-5 h-5" />
                  <h3 className="text-base font-bold font-display text-white">
                    ZapUPI Webhook URL Setup
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  Required For Direct Settlement
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Apne <strong>ZapUPI Merchant Account</strong> ke Settings me jaakar <strong>Webhook URL</strong> section me niche diya gaya link paste karein. Iske bina direct payments ka verification trigger nahi hoga.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={activeWebhookUrl}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#07090e] border border-[#1c2436] text-xs font-mono text-cyan-300 focus:outline-none select-all"
                />
                <button
                  onClick={handleCopyWebhook}
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md shadow-cyan-500/20"
                >
                  {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWebhook ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
            </div>

            {/* Add Additional ZapKey Form (Toggled) */}
            {showAddForm && (
              <form onSubmit={handleAddZapKey} className="p-5 rounded-2xl bg-[#070d1a] border border-emerald-500/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h4 className="text-sm font-bold font-display text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Register Additional ZapKey</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Priority #{merchantKeys.length + 1}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                    Merchant Business / Account Name
                  </label>
                  <input
                    type="text"
                    value={newMerchantName}
                    onChange={(e) => setNewMerchantName(e.target.value)}
                    placeholder="e.g. Primary Store, secondary_qr, etc."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-500 text-slate-100 text-xs placeholder-slate-600 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-1.5">
                    Merchant ZapKey Token <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newZapKey}
                    onChange={(e) => setNewZapKey(e.target.value)}
                    placeholder="zap_live_••••••••••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-500 text-slate-100 font-mono text-xs placeholder-slate-600 focus:outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Obtained from your zapupi.com dashboard under API Credentials / ZapKey.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={savingKey}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingKey ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering Key...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save & Add to Load Balancer</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Registered Keys List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Configured Merchant Keys ({merchantKeys.length})
                </span>
                {loadingKeys && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                )}
              </div>

              {merchantKeys.length === 0 && !loadingKeys && (
                <div className="p-8 rounded-2xl bg-[#050811] border border-dashed border-slate-800 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">No ZapKeys Configured Yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Add your first ZapUPI merchant key to start accepting direct peer-to-peer ₹{unitPrice.toLocaleString('en-IN')} payments into your UPI ID.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Your First ZapKey</span>
                  </button>
                </div>
              )}

              {merchantKeys.map((key, index) => {
                const isNextTarget = Boolean(key.is_active && lowestVolumeKey && key.id === lowestVolumeKey.id);
                const amount = Number(key.monthly_received_amount || 0);
                const limit = Number(key.monthly_limit || 75000);
                const usagePercent = limit > 0 ? Math.min(100, Math.round((amount / limit) * 100)) : 0;
                const remaining = Math.max(0, limit - amount);
                const isLoadingAction = actionLoadingId === key.id;

                return (
                  <div
                    key={key.id}
                    className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 relative ${
                      isNextTarget
                        ? 'bg-gradient-to-br from-[#0a1322] via-[#091522] to-[#070b14] border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : key.is_active
                        ? 'bg-[#060b14] border-slate-800/90 hover:border-slate-700'
                        : 'bg-[#05070c]/60 border-slate-900 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Top Row: Name, Status & Next Target Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold border ${
                          key.is_active 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-800/40 border-slate-700 text-slate-500'
                        }`}>
                          #{key.priority_order || index + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold font-display text-white">
                            {key.paytm_merchant_name || `Merchant Account #${index + 1}`}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            ID: {key.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Dynamic Highlight Badge for Next Payment Target */}
                        {isNextTarget && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10.5px] font-mono font-bold shadow-sm shadow-emerald-500/20 animate-pulse">
                            <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>★ Next Payment Target (Lowest Volume)</span>
                          </span>
                        )}

                        {/* Active / Inactive Toggle Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={key.is_active}
                          disabled={isLoadingAction}
                          onClick={() => handleToggleKey(key)}
                          className={`group inline-flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all cursor-pointer disabled:opacity-50 ${
                            key.is_active
                              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400 hover:border-emerald-400'
                              : 'bg-slate-900/90 border-slate-700/80 text-slate-400 hover:border-slate-600'
                          }`}
                          title={key.is_active ? 'Click to Pause Key' : 'Click to Activate Key'}
                        >
                          {/* Modern Sliding Pill Indicator */}
                          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${key.is_active ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${key.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                          <span className="text-[10.5px] font-mono font-semibold">
                            {key.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Masked ZapKey */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#04060c] border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          ZapKey:
                        </span>
                        <span className="font-mono text-xs text-slate-200 font-semibold tracking-wider">
                          {maskZapKey(key.zap_key)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyKey(key)}
                        className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800/60 transition-all cursor-pointer"
                        title="Copy ZapKey"
                      >
                        {copiedKeyId === key.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Monthly Usage Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span>This Month:</span>
                        </span>
                        <span className="font-bold text-white text-[11px]">
                          ₹{amount.toLocaleString('en-IN')} <span className="text-slate-500 font-normal">/ ₹{limit.toLocaleString('en-IN')}</span>
                        </span>
                      </div>

                      <div className="w-full bg-[#04060c] h-2 rounded-full overflow-hidden border border-slate-800/80">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            usagePercent >= 90
                              ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                              : usagePercent >= 70
                              ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>{usagePercent}% utilized</span>
                        <span>₹{remaining.toLocaleString('en-IN')} headroom remaining</span>
                      </div>
                    </div>

                    {/* Actions: Pause / Activate & Delete */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="text-[10px] font-mono text-slate-500">
                        Added: {key.created_at ? new Date(key.created_at).toLocaleDateString('en-IN') : 'Active'}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isLoadingAction}
                          onClick={() => handleToggleKey(key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                            key.is_active
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{key.is_active ? 'Pause Key' : 'Activate'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLoadingAction}
                          onClick={() => handleDeleteKey(key)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 hover:border-rose-400"
                          title="Delete ZapKey"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Col 2: Personal Profile, Security & Master Admin Controls (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
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
                You are logged in as an authorized Platform Master Administrator. You have full oversight over all global network volumes, user ID activations, and peer ledger audits.
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
