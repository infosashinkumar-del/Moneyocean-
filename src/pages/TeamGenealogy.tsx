import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Sparkles,
  Share2,
  Copy,
  Check,
  TrendingUp,
  UserPlus,
  GitFork,
  ListFilter,
  Calculator,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, getTeamTree, getLiveReferralUrl } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { InteractiveMatrixTree } from '../components/InteractiveMatrixTree';
import { SmartMatrixSimulator } from '../components/SmartMatrixSimulator';

export const TeamGenealogy: React.FC = () => {
  const { user, packagePrice } = useAuth();
  const unitPrice = packagePrice || 5000;
  const [team, setTeam] = useState<any[]>([]);
  const [settledTransactions, setSettledTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'TREE' | 'LIST' | 'SIMULATOR'>('TREE');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MY_PROFIT' | 'PASSED_UP' | 'PENDING'>('ALL');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const liveReferralUrl = user ? getLiveReferralUrl(user.referral_code) : '';

  // 1. Data Fetching
  const fetchLiveTeam = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [treeData, { data: txData }] = await Promise.all([
        getTeamTree(user.id),
        supabase
          .from('transactions')
          .select('buyer_user_id, beneficiary_user_id, sale_number, is_passup, transaction_type, amount, payment_status, utr_number, created_at')
          .eq('payment_status', 'SUCCESS')
          .or(`beneficiary_user_id.eq.${user.id},buyer_user_id.eq.${user.id},sponsor_id.eq.${user.id}`)
      ]);

      setTeam(treeData || []);
      setSettledTransactions(txData || []);
    } catch (err) {
      console.error('Data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTeam();
  }, [user?.id]);

  // 2. Smart Calculation: Har member ki kahani clear karein
  const smartMembers = useMemo(() => {
    return team.map((member) => {
      // Find real transaction
      const myTx = settledTransactions.find(t => t.buyer_user_id === member.id);
      
      const didIPayReceive = Boolean(myTx && myTx.beneficiary_user_id === user?.id);
      const moneyReceived = didIPayReceive ? Number(myTx?.amount || 0) : 0;
      const isPassedUp = Boolean(myTx && myTx.is_passup && myTx.beneficiary_user_id !== user?.id);

      // Downlines ki kamai jo mujhe aayi
      const downlines = (member.children || []).map((child: any) => {
        const childTx = settledTransactions.find(t => t.buyer_user_id === child.id);
        const didChildPayMe = Boolean(childTx && childTx.beneficiary_user_id === user?.id);
        const childMoney = didChildPayMe ? Number(childTx?.amount || 0) : 0;

        return {
          ...child,
          didChildPayMe,
          childMoney,
          utr: childTx?.utr_number || null,
          saleNum: childTx?.sale_number || 0
        };
      });

      // Total passup income from this specific member's branch
      const totalBranchPassiveIncome = downlines.reduce((acc, c) => acc + c.childMoney, 0);

      return {
        ...member,
        didIPayReceive,
        moneyReceived,
        isPassedUp,
        saleNum: myTx?.sale_number || 0,
        utr: myTx?.utr_number || null,
        downlines,
        totalBranchPassiveIncome
      };
    });
  }, [team, settledTransactions, user?.id]);

  // 3. Search & Filter
  const filteredList = useMemo(() => {
    return smartMembers.filter((m) => {
      const matchSearch = 
        m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.referral_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (activeFilter === 'MY_PROFIT') return m.didIPayReceive;
      if (activeFilter === 'PASSED_UP') return m.isPassedUp;
      if (activeFilter === 'PENDING') return !m.is_active;
      return true;
    });
  }, [smartMembers, searchQuery, activeFilter]);

  // Totals for top cards
  const directEarnings = smartMembers.reduce((sum, m) => sum + m.moneyReceived, 0);
  const teamPassiveEarnings = smartMembers.reduce((sum, m) => sum + m.totalBranchPassiveIncome, 0);
  
  // 1. Asli total seedha user profile / direct transactions sum se lein:
  const grandTotal = Number(user?.total_income || (directEarnings + teamPassiveEarnings));

  // 2. Agar koi deep pass-up hai jo Level 2 se neeche se aaya hai, use bhi reconcile karein:
  const deepPassups = Math.max(0, grandTotal - (directEarnings + teamPassiveEarnings));

  const handleCopyLink = () => {
    if (liveReferralUrl) {
      navigator.clipboard.writeText(liveReferralUrl);
      setCopiedLink(true);
      showToast('success', 'Link Copied', 'Referral link copy ho gaya!');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* 1. TOP CASH SUMMARY (Ekdum seedha hisaab) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0e1626] via-[#090d16] to-[#05070c] border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Aapki Kul Kamai (Total Net Payout)</span>
            </span>
            <div className="text-3xl sm:text-5xl font-black text-white mt-1 tracking-tight">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Zero company cut — seedha aapke bank UPI par mila paisa
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Referral Link'}</span>
            </button>
            <button
              onClick={fetchLiveTeam}
              disabled={loading}
              className="p-2.5 rounded-xl bg-[#111724] border border-[#232f48] text-slate-300 hover:text-white cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2 Quick Mini Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-[#0c121e]/80 p-3 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Direct Logo Se:</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400">
              ₹{directEarnings.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-[#0c121e]/80 p-3 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Team Pass-Up Se:</span>
            <span className="text-base sm:text-lg font-bold text-amber-400">
              ₹{(teamPassiveEarnings + deepPassups).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-[#0c121e]/80 p-3 rounded-2xl border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 block">Kul Direct Members:</span>
            <span className="text-base sm:text-lg font-bold text-white">
              {team.length} Log
            </span>
          </div>
        </div>
      </div>

      {/* 2. THREE POWERFUL VIEW MODES SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#090d16] border border-slate-800/90 rounded-2xl">
        <div className="flex items-center gap-1.5 p-1 bg-[#050811] rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('TREE')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewMode === 'TREE'
                ? 'gold-btn-gradient text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>Interactive Tree Canvas</span>
          </button>
          
          <button
            onClick={() => setViewMode('LIST')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewMode === 'LIST'
                ? 'gold-btn-gradient text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Audited Directory ({smartMembers.length})</span>
          </button>

          <button
            onClick={() => setViewMode('SIMULATOR')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewMode === 'SIMULATOR'
                ? 'gold-btn-gradient text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>2-Up Simulator</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time P2P Network</span>
        </div>
      </div>

      {/* 3. CONTENT AREA BASED ON VIEW MODE */}
      {viewMode === 'TREE' && (
        <div className="space-y-4">
          <InteractiveMatrixTree
            currentUser={{
              id: user?.id || 'me',
              full_name: user?.full_name || 'My Account',
              referral_code: user?.referral_code || '',
              email: user?.email || '',
              is_active: user?.is_active ?? true,
              direct_referrals_count: team.length,
              total_income: grandTotal
            }}
            teamData={smartMembers}
            liveReferralUrl={liveReferralUrl}
          />
        </div>
      )}

      {viewMode === 'SIMULATOR' && (
        <SmartMatrixSimulator 
          currentDirects={team.length}
          currentActiveDirects={smartMembers.filter(m => m.is_active).length}
        />
      )}

      {viewMode === 'LIST' && (
        <div className="space-y-4">
          {/* SEARCH & EASY FILTER TABS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0a0f1a] p-3 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Dost ka naam ya code dhoondo..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#050811] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'ALL', label: `Sabhi (${smartMembers.length})` },
                { id: 'MY_PROFIT', label: 'Mera Munafa' },
                { id: 'PASSED_UP', label: 'Upline Ko Gaya' },
                { id: 'PENDING', label: 'Inactive' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-[#101726] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* PEOPLE CARDS */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
              <p className="text-sm">Team aur payment ledger load ho raha hai...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-10 text-center bg-[#0a0e18] rounded-3xl border border-slate-800 space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-300">Koi member nahi mila</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Apna referral link share karein aur doston ko jodein.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredList.map((person) => {
                const isExpanded = expandedMemberId === person.id;
                const hasDownlines = person.downlines && person.downlines.length > 0;

                return (
                  <div 
                    key={person.id}
                    className="bg-[#0b101c] border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-md hover:border-slate-700"
                  >
                    {/* Main Member Row */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      
                      {/* Avatar + Name + Code */}
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          person.didIPayReceive 
                            ? 'gold-btn-gradient text-slate-950 shadow-md' 
                            : person.isPassedUp
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {person.full_name?.charAt(0)?.toUpperCase() || 'M'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">{person.full_name}</h4>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              #{person.referral_code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{person.email}</p>
                        </div>
                      </div>

                      {/* Status Badges & Money Story */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                        
                        {/* The Money Story */}
                        <div className="text-left sm:text-right">
                          {person.didIPayReceive ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aapko Mila: +₹{person.moneyReceived.toLocaleString('en-IN')}</span>
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                Direct Sale (Aapka Haq)
                              </span>
                            </div>
                          ) : person.isPassedUp ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Upline Ko Gaya</span>
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                Sale #{person.saleNum} Pass-Up Rule
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3" />
                                <span>Payment Baaki Hai</span>
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                Account Inactive
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Expand Downlines Toggle Button */}
                        {hasDownlines ? (
                          <button
                            onClick={() => setExpandedMemberId(isExpanded ? null : person.id)}
                            className="px-3 py-2 rounded-xl bg-[#121929] hover:bg-[#1a253c] border border-slate-700 text-xs font-bold text-amber-400 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>{person.downlines.length} Log Jode</span>
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : (
                          <div className="text-[11px] text-slate-500 font-mono px-2">
                            0 Downline
                          </div>
                        )}

                      </div>
                    </div>

                    {/* 4. EXPANDED DOWNLINE */}
                    {isExpanded && hasDownlines && (
                      <div className="bg-[#070b14] border-t border-slate-800 p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-800/80 pb-2">
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <ArrowDownLeft className="w-4 h-4" />
                            <span>{person.full_name} ki banayi hui team:</span>
                          </span>
                          {person.totalBranchPassiveIncome > 0 && (
                            <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                              Is team se aapko aaya: +₹{person.totalBranchPassiveIncome.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {person.downlines.map((child: any) => (
                            <div 
                              key={child.id}
                              className="bg-[#0b101c] p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  child.didChildPayMe ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {child.full_name?.charAt(0) || 'D'}
                                </div>
                                <div>
                                  <p className="font-bold text-white">{child.full_name}</p>
                                  <p className="text-[10px] text-slate-400">#{child.referral_code} • {child.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3">
                                {child.didChildPayMe ? (
                                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                                    🎁 Pass-up Aapko Aaya (+₹{child.childMoney.toLocaleString('en-IN')})
                                  </span>
                                ) : child.is_active ? (
                                  <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    {person.full_name} ko mila (Sale Kept)
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-amber-500/80 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                                    Payment Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};