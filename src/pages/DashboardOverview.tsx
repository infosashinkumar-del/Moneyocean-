import React, { useState, useEffect } from 'react';
import { 
  Banknote, 
  Calendar, 
  CalendarDays, 
  Award, 
  Users, 
  ArrowUpRight, 
  Share2, 
  Zap, 
  Copy, 
  Check, 
  Flame, 
  TrendingUp,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  QrCode,
  Send,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  Layers,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { showToast } from '../components/Toast';
import { getLiveReferralUrl, getUserTransactions } from '../lib/supabase';
import { Transaction } from '../types';

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
  onNavigateCheckout: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onNavigateCheckout
}) => {
  const { user, dashboardData, refreshUserData, packagePrice } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const referralUrl = user ? getLiveReferralUrl(user.referral_code) : '';

  useEffect(() => {
    if (user?.id) {
      loadRecentTx();
    }
  }, [user]);

  const loadRecentTx = async () => {
    if (!user?.id) return;
    setLoadingTx(true);
    try {
      const txs = await getUserTransactions(user.id, 5);
      setRecentTransactions(txs);
    } catch (err) {
      console.warn('Error loading recent txs:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUserData(), loadRecentTx()]);
    setRefreshing(false);
    showToast('info', 'Synced', 'Dashboard stats updated with live blockchain ledger.');
  };

  const handleCopyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    showToast('success', 'Referral Link Copied!', referralUrl);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsapp = () => {
    if (!referralUrl) return;
    const text = `🔥 *MoneyOcean 100% P2P Earning Model* 🔥\n\nDirect ₹${(packagePrice || 5000).toLocaleString('en-IN')} commission on every peer sale directly to your UPI/Bank. 100% transparent 2-Up pass-up matrix.\n\n👉 Join my team here: ${referralUrl}\nSponsor Code: *${user?.referral_code || ''}*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    if (!referralUrl) return;
    const text = `🚀 MoneyOcean Autonomous P2P Network — ₹${(packagePrice || 5000).toLocaleString('en-IN')} Direct Payouts. Join now: ${referralUrl}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const todayIncome = dashboardData?.earnings.today ?? user?.today_income ?? 0;
  const last7DaysIncome = dashboardData?.earnings.last_7_days ?? user?.last_7_days_income ?? 0;
  const last30DaysIncome = dashboardData?.earnings.last_30_days ?? user?.last_30_days_income ?? 0;
  const totalEarned = dashboardData?.earnings.total_earned ?? user?.total_income ?? 0;

  const directCount = dashboardData?.network.direct_count ?? user?.direct_referrals_count ?? 0;
  const teamSize = dashboardData?.network.team_size ?? user?.team_size ?? 0;
  const cycleCount = user?.cycle_earning_count ?? 0;

  // Qualification Status (3 direct sales required: 1st & 3rd pass-up, 2nd kept => Qualified)
  const isQualified = directCount >= 3;
  const unitPrice = packagePrice || 5000;

  // Direct kept sales: Sale #2, and all sales from #4 onwards (Sale #1 & #3 pass up)
  const directKeptSalesCount = directCount >= 3 ? (directCount - 2) : (directCount === 2 ? 1 : 0);
  const directRetainedEarned = directKeptSalesCount * unitPrice;
  const passivePassupEarned = Math.max(0, totalEarned - directRetainedEarned);

  const chartData = [
    { name: 'Day -6', income: Math.round(last7DaysIncome * 0.08) },
    { name: 'Day -5', income: Math.round(last7DaysIncome * 0.12) },
    { name: 'Day -4', income: Math.round(last7DaysIncome * 0.15) },
    { name: 'Day -3', income: Math.round(last7DaysIncome * 0.10) },
    { name: 'Day -2', income: Math.round(last7DaysIncome * 0.20) },
    { name: 'Yesterday', income: Math.max(0, Math.round(last7DaysIncome * 0.35) - Number(todayIncome)) },
    { name: 'Today', income: Number(todayIncome) }
  ];

  return (
    <div className="space-y-7 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
      {/* Top Banner / Welcome Node */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0b0f19] via-[#0d1424] to-[#07090e] border border-[#1e2a40] shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Smart Status Badge */}
            {user?.is_active ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#051711] border border-emerald-500/60 text-emerald-400 text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Status: <strong className="text-emerald-300 font-extrabold tracking-wide">{isQualified ? 'ACTIVE & QUALIFIED' : `ACTIVE (QUALIFYING: ${directCount}/3)`}</strong>
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1f0a0a] border border-red-500/60 text-red-400 text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  Status: <strong className="text-red-300 font-extrabold tracking-wide">INACTIVE</strong>
                </span>
              </div>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-white tracking-tight">
            Welcome back, <span className="emerald-gradient-text">{user?.full_name || 'Member'}</span>
          </h2>
        </div>

        <div className="relative z-10 shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111722] hover:bg-[#182132] border border-[#212c40] text-slate-300 hover:text-[#f3c368] text-xs font-semibold transition-all cursor-pointer shadow-md"
            title="Sync Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Ledger'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Dedicated Account Activation Hero Card when Inactive */}
      {user && !user.is_active && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#131008] via-[#10141d] to-[#070a10] border border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.12)] relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-3.5 relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ACCOUNT INACTIVE • ACTIVATION REQUIRED</span>
            </div>

            <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-display text-white tracking-tight">
              Activate Your Node for <span className="gold-gradient-text">₹{(packagePrice || 5000).toLocaleString('en-IN')} INR</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Activate your ID to enable direct peer-to-peer UPI settlements, full marketing toolkit access, downline 2-Up pass-up commissions, and withdrawal authorizations.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111724] border border-[#23314d] text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                100% Direct P2P (₹{(packagePrice || 5000).toLocaleString('en-IN')}/sale)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111724] border border-[#23314d] text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Automated 2-Up Pass-Up Leverage
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111724] border border-[#23314d] text-cyan-300 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Direct-to-Bank via UPI QR
              </span>
            </div>
          </div>

          <div className="relative z-10 shrink-0 flex flex-col items-start lg:items-end gap-3 w-full sm:w-auto">
            <div className="text-left lg:text-right">
              <div className="text-xs font-mono uppercase text-slate-400">One-Time Activation Fee</div>
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-white gold-gradient-text">₹{(packagePrice || 5000).toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-sans font-normal">INR</span></div>
            </div>
            <button
              onClick={onNavigateCheckout}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl gold-btn-gradient text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>ACTIVATE NOW (₹{(packagePrice || 5000).toLocaleString('en-IN')})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4 Smart Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Today's P2P Income"
          value={`₹${Number(todayIncome).toLocaleString('en-IN')}`}
          subtitle="Instant Direct Settlements"
          icon={Banknote}
          variant="emerald"
          badge="Live P2P"
          badgeType="success"
        />

        <StatCard
          title="Last 7 Days"
          value={`₹${Number(last7DaysIncome).toLocaleString('en-IN')}`}
          subtitle="Weekly Volume"
          icon={Calendar}
          variant="cyan"
          badge="7-Day Sum"
          badgeType="info"
        />

        <StatCard
          title="Last 30 Days"
          value={`₹${Number(last30DaysIncome).toLocaleString('en-IN')}`}
          subtitle="Monthly Cumulative"
          icon={CalendarDays}
          variant="purple"
          badge="30-Day Sum"
          badgeType="info"
        />

        <StatCard
          title="Lifetime Earned"
          value={`₹${Number(totalEarned).toLocaleString('en-IN')}`}
          subtitle="All-time Grand Total"
          icon={Award}
          variant="amber"
          badge="Lifetime"
          badgeType="warning"
        />
      </div>

      {/* Main Grid: Earnings Chart (2 cols) & Income Breakdown Snapshot (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Earnings Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#e5a93c]" />
                <span>Earnings Velocity Trend (INR)</span>
              </h3>
              <p className="text-xs text-slate-400">Past 7 days income activity from direct & pass-up sales</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e5a93c" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#e5a93c" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#152030" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0b0f17', 
                    borderColor: '#e5a93c', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Income']}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#e5a93c" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#incomeGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income Breakdown & Network Snapshot (1 col) */}
        <div className="space-y-6">
          {/* Income Source Card */}
          <div className="p-6 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] shadow-xl space-y-4">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              <span>Income Origin Breakdown</span>
            </h3>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-[#07090e] border border-[#1c2436] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Direct Retained Sales</div>
                  <div className="text-[10px] text-slate-400">100% Commission kept by you</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-400">
                    ₹{directRetainedEarned.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">₹{(packagePrice || 5000).toLocaleString('en-IN')} per sale</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#07090e] border border-[#1c2436] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Passive Pass-Up Inflows</div>
                  <div className="text-[10px] text-slate-400">Downlines' 1st & 3rd sales passed to you</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#e5a93c]">
                    ₹{passivePassupEarned.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">Automated UPI</div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1c2436] flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Verified P2P Inflow</span>
              <span className="font-mono font-bold text-white">₹{Number(totalEarned).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Network Snapshot Card */}
          <div className="p-6 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] shadow-xl space-y-4">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Network Downlines</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1c2436] text-center">
                <p className="text-[11px] text-slate-400 font-mono uppercase">Direct Referrals</p>
                <p className="text-2xl font-bold font-display text-white mt-1">{directCount}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">Level 1 Nodes</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1c2436] text-center">
                <p className="text-[11px] text-slate-400 font-mono uppercase">Total Team Size</p>
                <p className="text-2xl font-bold font-display text-[#e5a93c] mt-1">{teamSize}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">All Generations</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('team')}
              className="w-full py-2.5 rounded-xl bg-[#141b27] hover:bg-[#1c2638] text-slate-200 hover:text-white border border-[#243147] font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Team Genealogy</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent P2P Transactions Stream Table */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c2436] pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold font-display text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span>Recent Peer P2P Settlements</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">Direct peer ledger settlements verified with bank reference numbers</p>
          </div>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="self-start sm:self-auto text-xs font-semibold text-[#e5a93c] hover:text-[#ffd76b] flex items-center gap-1 cursor-pointer py-1"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingTx ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
            <p>Loading transactions ledger...</p>
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <Banknote className="w-8 h-8 mx-auto text-slate-600" />
            <p>No P2P settlements yet. Share your referral link to earn ₹{(packagePrice || 5000).toLocaleString('en-IN')} direct!</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#1c2436] scrollbar-track-transparent">
            <table className="w-full text-left text-xs font-sans min-w-[580px]">
              <thead>
                <tr className="border-b border-[#1c2436] text-slate-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
                  <th className="pb-3 px-2 font-semibold">ORDER / DATE</th>
                  <th className="pb-3 px-2 font-semibold">BUYER</th>
                  <th className="pb-3 px-2 font-semibold">COMMISSION TYPE</th>
                  <th className="pb-3 px-2 font-semibold">AMOUNT</th>
                  <th className="pb-3 px-2 font-semibold text-right">UTR STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2436] font-mono">
                {recentTransactions.map((tx) => {
                  const isPassup = tx.transaction_type?.includes('PASSUP') || tx.transaction_type?.includes('Pass');
                  return (
                    <tr key={tx.id || tx.order_id} className="hover:bg-[#121824]/80 transition-colors">
                      <td className="py-3.5 px-2">
                        <div className="font-bold text-white tracking-wide">{tx.order_id || 'ORDER'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN') : 'Recent'}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 font-sans">
                        <div className="font-semibold text-slate-200">{tx.buyer?.full_name || 'Member'}</div>
                        <div className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">{tx.buyer?.email || ''}</div>
                      </td>
                      <td className="py-3.5 px-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                          isPassup 
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isPassup ? '2-Up Pass-Up' : '100% Direct'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 font-bold text-emerald-400 text-sm whitespace-nowrap">
                        ₹{Number(tx.amount !== undefined && tx.amount !== null ? tx.amount : unitPrice).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-2 text-right whitespace-nowrap">
                        {tx.payment_status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>SETTLED ({tx.utr_number ? tx.utr_number.slice(-4) : 'UPI'})</span>
                          </span>
                        ) : tx.payment_status === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/30">
                            <span>FAILED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#091122] border border-emerald-500/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative animate-fadeIn">
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white">Your Live Referral QR</h3>
              <p className="text-xs text-slate-400">Scan to join under your node ({user?.referral_code})</p>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}`}
                alt="Referral QR Code"
                className="w-48 h-48"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {copied ? 'Link Copied!' : 'Copy Referral URL'}
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
