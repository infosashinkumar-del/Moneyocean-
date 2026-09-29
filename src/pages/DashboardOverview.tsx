import React, { useState, useEffect, useMemo } from 'react';
import { 
  Banknote, 
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
  Activity,
  UserCheck,
  Percent,
  BarChart3
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { ReferralCard } from '../components/ReferralCard';
import { UltraPayLogo } from '../components/UltraPayLogo';
import { showToast } from '../components/Toast';
import { 
  getLiveReferralUrl, 
  getUserTransactions, 
  getUserIncomeTransactions,
  getUserCalendarMonthEarned, 
  getUserIncomeOriginBreakdown 
} from '../lib/supabase';
import { Transaction } from '../types';

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
  onNavigateCheckout: () => void;
}

const CustomChartTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-4 rounded-2xl bg-[#070b14]/95 border border-amber-500/30 shadow-2xl backdrop-blur-xl space-y-2.5 min-w-[210px] z-50">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <span className="text-[11px] font-mono text-slate-300 font-bold">{data.fullDate || data.dayLabel}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold">
            {data.salesCount || 0} {data.salesCount === 1 ? 'Sale' : 'Sales'}
          </span>
        </div>
        <div className="space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              <span className="font-semibold text-white">Total Payout:</span>
            </span>
            <span className="font-bold text-amber-300 text-sm">
              ₹{Number(data.total).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/50">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              <span>Direct 100%:</span>
            </span>
            <span className="text-emerald-300 font-semibold">
              ₹{Number(data.direct).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
              <span>2-Up Pass-Up:</span>
            </span>
            <span className="text-cyan-300 font-semibold">
              ₹{Number(data.passup).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        <div className="text-[9px] text-slate-400 pt-1.5 border-t border-slate-800/50 flex items-center gap-1.5 font-mono">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Real-time Bank UPI Settlement</span>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onNavigateCheckout
}) => {
  const { user, dashboardData, refreshUserData, packagePrice } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [calendarMonthEarned, setCalendarMonthEarned] = useState<number | null>(null);
  const [directRetainedEarned, setDirectRetainedEarned] = useState<number>(0);
  const [passivePassupEarned, setPassivePassupEarned] = useState<number>(0);
  const [loadingTx, setLoadingTx] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced Earning Graph State
  const [chartTimeframe, setChartTimeframe] = useState<'7D' | '14D' | '30D' | 'MTD'>('7D');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [chartMetric, setChartMetric] = useState<'all' | 'direct' | 'passup'>('all');
  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>([]);
  const [loadingChartTx, setLoadingChartTx] = useState(false);

  const referralUrl = user ? getLiveReferralUrl(user.referral_code) : '';

  useEffect(() => {
    if (user?.id) {
      loadRecentTx();
      loadCalendarMonthEarned();
      loadIncomeOriginBreakdown();
      loadChartTransactions();
    }
  }, [user]);

  const loadChartTransactions = async () => {
    if (!user?.id) return;
    setLoadingChartTx(true);
    try {
      const txs = await getUserIncomeTransactions(user.id, 200);
      setIncomeTransactions(txs);
    } catch (err) {
      console.warn('Error loading chart transactions:', err);
    } finally {
      setLoadingChartTx(false);
    }
  };

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

  const loadCalendarMonthEarned = async () => {
    if (!user?.id) return;
    try {
      const earned = await getUserCalendarMonthEarned(user.id);
      setCalendarMonthEarned(earned);
    } catch (err) {
      console.warn('Error loading calendar month earned:', err);
    }
  };

  const loadIncomeOriginBreakdown = async () => {
    if (!user?.id) return;
    try {
      const breakdown = await getUserIncomeOriginBreakdown(user.id);
      setDirectRetainedEarned(breakdown.directRetainedEarned);
      setPassivePassupEarned(breakdown.passivePassupEarned);
    } catch (err) {
      console.warn('Error loading income origin breakdown:', err);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshUserData(), 
      loadRecentTx(), 
      loadCalendarMonthEarned(),
      loadIncomeOriginBreakdown(),
      loadChartTransactions()
    ]);
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

  const unitPrice = packagePrice;

  const handleShareWhatsapp = () => {
    if (!referralUrl) return;
    const text = `🔥 *UltraPay 100% P2P Earning Model* 🔥\n\nDirect ₹${unitPrice.toLocaleString('en-IN')} commission on every peer sale directly to your UPI/Bank. 100% transparent 2-Up pass-up matrix.\n\n👉 Join my team here: ${referralUrl}\nSponsor Code: *${user?.referral_code || ''}*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    if (!referralUrl) return;
    const text = `🚀 UltraPay Autonomous P2P Network — ₹${unitPrice.toLocaleString('en-IN')} Direct Payouts. Join now: ${referralUrl}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const todayIncome = dashboardData?.earnings.today ?? user?.today_income ?? 0;
  const last7DaysIncome = dashboardData?.earnings.last_7_days ?? user?.last_7_days_income ?? 0;
  const thisMonthIncome = calendarMonthEarned !== null 
    ? calendarMonthEarned 
    : (dashboardData?.earnings.last_30_days ?? user?.last_30_days_income ?? 0);
  const totalEarned = dashboardData?.earnings.total_earned ?? user?.total_income ?? 0;

  const directCount = dashboardData?.network.direct_count ?? user?.direct_referrals_count ?? 0;
  const teamSize = dashboardData?.network.team_size ?? user?.team_size ?? 0;
  const cycleCount = user?.cycle_earning_count ?? 0;

  // Qualification Status (3 direct sales required: 1st & 3rd pass-up, 2nd kept => Qualified)
  const isQualified = directCount >= 3;

  const chartData = useMemo(() => {
    const points: Array<{
      dateKey: string;
      dayLabel: string;
      fullDate: string;
      total: number;
      direct: number;
      passup: number;
      salesCount: number;
      directCount: number;
      passupCount: number;
    }> = [];

    const now = new Date();
    let daysCount = 7;
    if (chartTimeframe === '14D') daysCount = 14;
    else if (chartTimeframe === '30D') daysCount = 30;
    else if (chartTimeframe === 'MTD') {
      daysCount = Math.max(1, now.getDate());
    }

    // Map existing incoming transactions by local YYYY-MM-DD
    const txMap = new Map<string, { direct: number; passup: number; directCount: number; passupCount: number }>();
    (incomeTransactions || []).forEach(tx => {
      if (tx.payment_status !== 'SUCCESS') return;
      const d = new Date(tx.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const curr = txMap.get(key) || { direct: 0, passup: 0, directCount: 0, passupCount: 0 };
      const amt = Number(tx.amount || 0);
      const isDirect = tx.transaction_type === 'DIRECT_REFERRAL_100PCT';
      if (isDirect) {
        curr.direct += amt;
        curr.directCount += 1;
      } else {
        curr.passup += amt;
        curr.passupCount += 1;
      }
      txMap.set(key, curr);
    });

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const dayData = txMap.get(key) || { direct: 0, passup: 0, directCount: 0, passupCount: 0 };
      const total = dayData.direct + dayData.passup;
      const salesCount = dayData.directCount + dayData.passupCount;

      const dayLabel = i === 0 
        ? 'Today' 
        : i === 1 
        ? 'Yesterday' 
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      const fullDate = d.toLocaleDateString('en-IN', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });

      points.push({
        dateKey: key,
        dayLabel,
        fullDate,
        total,
        direct: dayData.direct,
        passup: dayData.passup,
        salesCount,
        directCount: dayData.directCount,
        passupCount: dayData.passupCount
      });
    }

    // Safety fallback: if no transactions in raw table yet but user has today/last_7_days income
    const hasAnyInMap = points.some(p => p.total > 0);
    if (!hasAnyInMap && (Number(todayIncome) > 0 || Number(last7DaysIncome) > 0)) {
      if (points.length > 0) {
        const tVal = Number(todayIncome);
        points[points.length - 1].total = tVal;
        points[points.length - 1].direct = tVal;
        points[points.length - 1].salesCount = Math.max(1, Math.round(tVal / (unitPrice || 500)));
      }
    }

    return points;
  }, [incomeTransactions, chartTimeframe, todayIncome, last7DaysIncome, unitPrice]);

  const periodStats = useMemo(() => {
    const total = chartData.reduce((acc, curr) => acc + curr.total, 0);
    const directTotal = chartData.reduce((acc, curr) => acc + curr.direct, 0);
    const passupTotal = chartData.reduce((acc, curr) => acc + curr.passup, 0);
    const totalSales = chartData.reduce((acc, curr) => acc + curr.salesCount, 0);
    const directSales = chartData.reduce((acc, curr) => acc + curr.directCount, 0);
    const passupSales = chartData.reduce((acc, curr) => acc + curr.passupCount, 0);
    
    const dailyAverage = chartData.length > 0 ? Math.round(total / chartData.length) : 0;
    
    let peak = chartData[0];
    chartData.forEach(p => {
      if (p.total > (peak?.total || 0)) {
        peak = p;
      }
    });

    return {
      total,
      directTotal,
      passupTotal,
      totalSales,
      directSales,
      passupSales,
      dailyAverage,
      peakDay: peak && peak.total > 0 ? peak : null
    };
  }, [chartData]);

  return (
    <div className="space-y-7 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
      {/* Top Banner / Welcome Node */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0b0f19] via-[#0d1424] to-[#07090e] border border-[#1e2a40] shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <UltraPayLogo size="xs" subtitle="Har Second Settlement, Seedha Bank Account Mein." />
            
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

      {/* Referral Link & Status Activation Card */}
      <ReferralCard onNavigateCheckout={onNavigateCheckout} />

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
              Activate Your ID for <span className="gold-gradient-text">₹{unitPrice.toLocaleString('en-IN')} INR</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Activate your ID to enable direct peer-to-peer UPI settlements, full marketing toolkit access, downline 2-Up pass-up commissions, and withdrawal authorizations.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111724] border border-[#23314d] text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                100% Direct P2P (₹{unitPrice.toLocaleString('en-IN')}/sale)
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
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-white gold-gradient-text">₹{unitPrice.toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-sans font-normal">INR</span></div>
            </div>
            <button
              onClick={onNavigateCheckout}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl gold-btn-gradient text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>ACTIVATE NOW (₹{unitPrice.toLocaleString('en-IN')})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Smart Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
          title="THIS MONTH EARNED"
          value={`₹${Number(thisMonthIncome).toLocaleString('en-IN')}`}
          subtitle="1st to Month End (Calendar Month)"
          icon={CalendarDays}
          variant="purple"
          badge="Calendar Month"
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
        {/* Earnings Velocity & Inflow Analytics (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#0c1017]/95 via-[#080d16] to-[#050811] backdrop-blur-xl border border-amber-500/25 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/70 pb-4 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                  Earnings Velocity & Settlement Graph
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time daily incoming payouts from Direct P2P & 2-Up Pass-Up streams
              </p>
            </div>

            {/* Interactive Control Cluster: Timeframe & Chart Style */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Timeframe Selector Segmented Buttons */}
              <div className="flex items-center p-1 rounded-xl bg-[#050811] border border-slate-800 text-xs font-mono">
                {(['7D', '14D', '30D', 'MTD'] as const).map(tf => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setChartTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      chartTimeframe === tf
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart Type Toggle: Area vs Bar */}
              <div className="flex items-center p-1 rounded-xl bg-[#050811] border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  title="Smooth Spline Area Chart"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    chartType === 'area'
                      ? 'bg-[#1b273d] text-amber-400 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  title="Rounded Pillars Bar Chart"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-[#1b273d] text-amber-400 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* KPI Strip: Period Payout, Direct, Pass-Up, Peak Day */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            {/* Metric 1: Total Period Income */}
            <div className="p-3.5 rounded-2xl bg-[#070b14]/80 border border-amber-500/20 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Period Payout ({chartTimeframe})
              </span>
              <div className="text-lg sm:text-xl font-bold font-display text-white truncate">
                ₹{periodStats.total.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] font-mono text-emerald-400 block">
                {periodStats.totalSales} {periodStats.totalSales === 1 ? 'sale settled' : 'sales settled'}
              </span>
            </div>

            {/* Metric 2: Direct 100% */}
            <div className="p-3.5 rounded-2xl bg-[#070b14]/80 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Direct 100% P2P
              </span>
              <div className="text-lg sm:text-xl font-bold font-display text-emerald-400 truncate">
                ₹{periodStats.directTotal.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] font-mono text-slate-400 block">
                {periodStats.directSales} direct sales
              </span>
            </div>

            {/* Metric 3: 2-Up Pass-Up */}
            <div className="p-3.5 rounded-2xl bg-[#070b14]/80 border border-cyan-500/20 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Passive Pass-Up
              </span>
              <div className="text-lg sm:text-xl font-bold font-display text-cyan-400 truncate">
                ₹{periodStats.passupTotal.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] font-mono text-slate-400 block">
                {periodStats.passupSales} pass-up inflows
              </span>
            </div>

            {/* Metric 4: Peak Single Day */}
            <div className="p-3.5 rounded-2xl bg-[#070b14]/80 border border-purple-500/20 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Peak Single Day
              </span>
              <div className="text-lg sm:text-xl font-bold font-display text-purple-300 truncate">
                {periodStats.peakDay ? `₹${periodStats.peakDay.total.toLocaleString('en-IN')}` : '₹0'}
              </div>
              <span className="text-[10px] font-mono text-slate-400 block truncate">
                {periodStats.peakDay ? periodStats.peakDay.dayLabel : 'No sales yet'}
              </span>
            </div>
          </div>

          {/* Series Filter Selector: All / Direct / Pass-Up */}
          <div className="flex items-center justify-between gap-3 text-xs pt-1 relative z-10">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[11px] text-slate-400">Stream Filter:</span>
              <div className="inline-flex p-0.5 rounded-lg bg-[#050811] border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartMetric('all')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    chartMetric === 'all'
                      ? 'bg-[#1c273e] text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Streams
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('direct')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    chartMetric === 'direct'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Direct Only
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('passup')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    chartMetric === 'passup'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pass-Up Only
                </button>
              </div>
            </div>

            {/* Live Chart Legend */}
            <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                <span className="text-slate-300">Total Payout</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                <span className="text-slate-300">Direct 100%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                <span className="text-slate-300">Pass-Up</span>
              </span>
            </div>
          </div>

          {/* Graph Body */}
          <div className="h-72 sm:h-80 w-full pt-2 relative z-10">
            {loadingChartTx ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 font-mono text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                <span>Aggregating daily incoming ledger...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="areaEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="areaCyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#162032" vertical={false} />
                    <XAxis 
                      dataKey="dayLabel" 
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
                      tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    {chartMetric === 'all' && (
                      <>
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#f59e0b" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#areaGold)" 
                          activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="direct" 
                          stroke="#10b981" 
                          strokeWidth={2} 
                          strokeDasharray="4 4"
                          fillOpacity={0} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="passup" 
                          stroke="#06b6d4" 
                          strokeWidth={2} 
                          strokeDasharray="3 3"
                          fillOpacity={0} 
                        />
                      </>
                    )}
                    {chartMetric === 'direct' && (
                      <Area 
                        type="monotone" 
                        dataKey="direct" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#areaEmerald)" 
                        activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    )}
                    {chartMetric === 'passup' && (
                      <Area 
                        type="monotone" 
                        dataKey="passup" 
                        stroke="#06b6d4" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#areaCyan)" 
                        activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    )}
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 12, right: 12, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#b45309" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="barEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#047857" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="barCyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#0e7490" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#162032" vertical={false} />
                    <XAxis 
                      dataKey="dayLabel" 
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
                      tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    {chartMetric === 'all' && (
                      <>
                        <Bar dataKey="direct" name="Direct 100%" stackId="a" fill="url(#barEmerald)" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="passup" name="Pass-Up" stackId="a" fill="url(#barGold)" radius={[6, 6, 0, 0]} />
                      </>
                    )}
                    {chartMetric === 'direct' && (
                      <Bar dataKey="direct" name="Direct 100%" fill="url(#barEmerald)" radius={[6, 6, 0, 0]} />
                    )}
                    {chartMetric === 'passup' && (
                      <Bar dataKey="passup" name="Pass-Up" fill="url(#barCyan)" radius={[6, 6, 0, 0]} />
                    )}
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Footer Ledger Guarantee */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/70 text-slate-400 text-xs font-mono relative z-10">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Direct Bank Settlement Protocol Active</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Daily Velocity: <strong className="text-white">₹{periodStats.dailyAverage.toLocaleString('en-IN')} / day</strong>
            </div>
          </div>
        </div>

        {/* Income Breakdown & Network Snapshot (1 col) */}
        <div className="space-y-6">
          {/* Smart Income Origin Breakdown Cards */}
          <div className="p-6 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <span>Income Origin Breakdown</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                P2P Split
              </span>
            </div>

            {/* Smart Dual Sub-Cards (Matching Top StatCard design) */}
            <div className="grid grid-cols-1 gap-3.5">
              {/* Direct Retained Sales Card */}
              <div className="p-4 rounded-2xl bg-[#07090e] border border-emerald-500/25 hover:border-emerald-400/50 shadow-lg shadow-emerald-950/20 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                        Direct Retained Sales
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono bg-emerald-950/90 text-emerald-400 border border-emerald-500/30">
                        100% Direct
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-display text-white mt-1 tracking-tight tabular-nums">
                      ₹{directRetainedEarned.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[#1c2436] text-[11px] text-slate-400">
                  <span>Commission kept by you</span>
                  <span className="font-mono text-emerald-400 font-semibold">₹{unitPrice.toLocaleString('en-IN')} / sale</span>
                </div>
              </div>

              {/* Passive Pass-Up Inflows Card */}
              <div className="p-4 rounded-2xl bg-[#07090e] border border-amber-500/25 hover:border-amber-400/50 shadow-lg shadow-amber-950/20 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                        Passive Pass-Up Inflows
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono bg-amber-950/90 text-amber-300 border border-amber-500/30">
                        2-Up Pass-Up
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-display text-[#e5a93c] mt-1 tracking-tight tabular-nums">
                      ₹{passivePassupEarned.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl border border-amber-500/40 bg-amber-950/60 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[#1c2436] text-[11px] text-slate-400">
                  <span>Downlines' 1st & 3rd sales</span>
                  <span className="font-mono text-amber-400 font-semibold">Automated UPI</span>
                </div>
              </div>
            </div>

            {/* Total Inflow Summary Pill */}
            <div className="pt-3 border-t border-[#1c2436] flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Total Verified P2P Inflow</span>
              <span className="font-mono font-bold text-white text-sm">
                ₹{Number(totalEarned).toLocaleString('en-IN')}
              </span>
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
                <p className="text-[10px] text-emerald-400 mt-0.5">Level 1 IDs</p>
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
            <p>No P2P settlements yet. Share your referral link to earn ₹{unitPrice.toLocaleString('en-IN')} direct!</p>
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
              <p className="text-xs text-slate-400">Scan to join under your ID ({user?.referral_code})</p>
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
