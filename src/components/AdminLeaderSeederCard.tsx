import React, { useState } from 'react';
import { 
  Search, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ShieldAlert,
  X
} from 'lucide-react';
import { supabase, adminSeedLeader } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

export const AdminLeaderSeederCard: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { user: currentAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 1. Search User by Referral Code or Email
  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      showToast('error', 'Query Required', 'Referral code ya email enter karein');
      return;
    }

    setSearching(true);
    setFoundUser(null);
    setShowConfirmModal(false);

    try {
      const cleanCode = q.toUpperCase();
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, referral_code, is_active, sponsor_id, total_income, joining_date')
        .or(`referral_code.eq.${cleanCode},email.ilike.${q}`)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        showToast('error', 'Not Found', `Code ya Email "${q}" se koi user nahi mila.`);
      } else {
        setFoundUser(data);
        showToast('info', 'User Found', `${data.full_name} (${data.referral_code})`);
      }
    } catch (err: any) {
      showToast('error', 'Search Error', err.message);
    } finally {
      setSearching(false);
    }
  };

  // 2. Trigger Seed & Free Activation RPC
  const handleActivateLeader = async () => {
    if (!foundUser?.id) return;
    if (!currentAdmin?.id) {
      showToast('error', 'Unauthorized', 'Admin session missing');
      return;
    }

    setShowConfirmModal(false);
    setSeeding(true);
    try {
      const res = await adminSeedLeader(foundUser.id, currentAdmin.id);

      if (res.success) {
        showToast('success', 'Leader Activated!', `${foundUser.full_name} ki ID free me active ho chuki hai!`);
        // State instantly update karein
        setFoundUser((prev: any) => ({ ...prev, is_active: true, sponsor_id: currentAdmin.id }));
        if (onComplete) onComplete();
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      showToast('error', 'Activation Failed', err.message || 'Function execution error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[#091122]/80 backdrop-blur-xl border border-amber-500/30 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#1c273e] pb-4">
        <div className="flex items-center gap-2 text-amber-400">
          <Sparkles className="w-5 h-5" />
          <h3 className="text-base sm:text-lg font-bold font-display text-white">
            Leader VIP Seeding & Free Activation Console
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40">
          0-Cost Root Binding
        </span>
      </div>

      <p className="text-xs text-slate-300">
        Naye leader ka sign up hone ke baad unka <strong>Referral Code</strong> ya <strong>Email</strong> search karein aur single click se unki ID activate karein.
      </p>

      {/* Search Input */}
      <form onSubmit={handleSearchUser} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Referral Code (e.g. MO123456) ya Email..."
            className="w-full px-4 py-2.5 bg-[#050811] border border-slate-800 focus:border-amber-400 text-slate-100 font-mono text-xs rounded-xl focus:outline-none placeholder-slate-600"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !searchQuery.trim()}
          className="px-5 py-2.5 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-md shadow-amber-500/20"
        >
          {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Search</span>
        </button>
      </form>

      {/* Search Result Card */}
      {foundUser && (
        <div className="p-4 rounded-2xl bg-[#050811] border border-[#1c2436] space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
                {foundUser.full_name?.charAt(0)?.toUpperCase() || 'L'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm">{foundUser.full_name}</h4>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    #{foundUser.referral_code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">{foundUser.email}</p>
              </div>
            </div>

            {/* Status Pill */}
            <div>
              {foundUser.is_active ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-xs font-bold font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ALREADY ACTIVE</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>INACTIVE (PENDING)</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">
              User ID: <code className="text-slate-300">{foundUser.id}</code>
            </span>

            {foundUser.is_active ? (
              <span className="text-emerald-400 font-semibold text-xs">
                Yeh ID pehle se active hai. Kisi action ki zaroorat nahi.
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={seeding}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {seeding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Seeding in Progress...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Seed & Activate Free ID</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Custom In-App Confirmation Modal (Zero window.confirm calls for iframe safety) */}
      {showConfirmModal && foundUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#091122] border border-amber-500/40 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1c273e] pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-white text-base">Confirm Free Leader Activation</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#050811] border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Leader Name:</span>
                <span className="text-white font-bold">{foundUser.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Referral Code:</span>
                <span className="font-mono text-amber-400 font-bold">#{foundUser.referral_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-300">{foundUser.email}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Kya aap <strong>{foundUser.full_name}</strong> (<span className="text-amber-400 font-mono">#{foundUser.referral_code}</span>) ko bina payment Admin ke direct me <strong>FREE activate</strong> karna chahte hain?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivateLeader}
                disabled={seeding}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {seeding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Yes, Activate Free ID</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
