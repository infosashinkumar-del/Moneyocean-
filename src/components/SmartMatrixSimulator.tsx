import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  Zap, 
  CheckCircle2, 
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  IndianRupee
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SmartMatrixSimulatorProps {
  currentDirects?: number;
  currentActiveDirects?: number;
}

export const SmartMatrixSimulator: React.FC<SmartMatrixSimulatorProps> = ({
  currentDirects = 0,
  currentActiveDirects = 0
}) => {
  const { packagePrice } = useAuth();
  const unitPrice = packagePrice;
  const [directsCount, setDirectsCount] = useState<number>(Math.max(4, currentDirects || 6));
  const [avgDownlineSales, setAvgDownlineSales] = useState<number>(4);
  const [depthTier, setDepthTier] = useState<number>(3); // 2 to 5 levels

  // Presets
  const handlePreset = (directs: number, avgSales: number, depth: number) => {
    setDirectsCount(directs);
    setAvgDownlineSales(avgSales);
    setDepthTier(depth);
  };

  // 2-Up Math Calculations
  const calculation = useMemo(() => {
    const directKept = Math.max(0, directsCount - 2); // Sales #1 and #3 passed up, #2 and #4+ kept
    const passedToUpline = Math.min(2, directsCount);

    const directIncome = directKept * unitPrice;

    // Level 2 Pass-Up Inflow:
    // Each kept direct member gives you their 1st & 3rd sale (2 pass-ups each) if they make >= 3 sales
    // If avgDownlineSales >= 3: 2 pass-ups per direct kept
    // If avgDownlineSales === 2: 1 pass-up (Sale #1)
    // If avgDownlineSales === 1: 1 pass-up (Sale #1)
    // If avgDownlineSales === 0: 0
    let passUpsPerNode = 0;
    if (avgDownlineSales >= 3) passUpsPerNode = 2;
    else if (avgDownlineSales >= 1) passUpsPerNode = 1;

    const level2Passups = directKept * passUpsPerNode;
    const level2Income = level2Passups * unitPrice;

    // Level 3 Pass-Ups (Each level 2 pass-up member gives you their 1st & 3rd sale)
    const level3Passups = depthTier >= 3 ? level2Passups * passUpsPerNode : 0;
    const level3Income = level3Passups * unitPrice;

    // Level 4 Pass-Ups
    const level4Passups = depthTier >= 4 ? level3Passups * passUpsPerNode : 0;
    const level4Income = level4Passups * unitPrice;

    // Level 5 Pass-Ups
    const level5Passups = depthTier >= 5 ? level4Passups * passUpsPerNode : 0;
    const level5Income = level5Passups * unitPrice;

    const totalTeamMembers = directsCount + level2Passups + level3Passups + level4Passups + level5Passups;
    const totalPassupsReceived = level2Passups + level3Passups + level4Passups + level5Passups;
    const totalIncome = directIncome + level2Income + level3Income + level4Income + level5Income;

    return {
      directKept,
      passedToUpline,
      directIncome,
      level2Passups,
      level2Income,
      level3Passups,
      level3Income,
      level4Passups,
      level4Income,
      level5Passups,
      level5Income,
      totalTeamMembers,
      totalPassupsReceived,
      totalIncome
    };
  }, [directsCount, avgDownlineSales, depthTier, unitPrice]);

  return (
    <div className="space-y-6">
      {/* Simulator Intro Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-[#0c111c] via-[#101726] to-[#07090e] border border-[#1e2a40] shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>2-Up Exponential Compounding Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
            Smart P2P Yield & Pass-Up Simulator
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Simulate your infinite compounding income. In UltraPay, you keep 100% (₹{unitPrice.toLocaleString('en-IN')}) of Sales #2 and #4+, and receive the 1st & 3rd sale from every qualifying partner to infinite depth!
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 relative z-10 shrink-0">
          <span className="text-xs font-mono text-slate-400 mr-1 hidden sm:inline">Presets:</span>
          {[
            { label: '🌱 Starter (4 Directs)', directs: 4, sales: 3, depth: 2 },
            { label: '🚀 Pro Builder (10 Directs)', directs: 10, sales: 4, depth: 3 },
            { label: '👑 Mega Leader (25 Directs)', directs: 25, sales: 5, depth: 4 }
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePreset(preset.directs, preset.sales, preset.depth)}
              className="px-3 py-1.5 rounded-xl bg-[#111722] hover:bg-[#192233] border border-[#212c40] hover:border-amber-500/40 text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Inputs & Dynamic Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column (1 col on lg) */}
        <div className="p-6 rounded-3xl bg-[#0c1017] border border-[#1c2436] shadow-xl space-y-6 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-[#1c2436] pb-4">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h4 className="text-base font-bold font-display text-white">Simulation Variables</h4>
          </div>

          {/* Slider 1: Direct Referrals */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Direct Referrals (You Sponsor)</span>
              </span>
              <span className="text-base font-bold text-amber-400 font-display">{directsCount} Members</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              value={directsCount}
              onChange={(e) => setDirectsCount(Number(e.target.value))}
              className="w-full h-2 bg-[#111722] rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>2 (Min Qualifying)</span>
              <span>25</span>
              <span>50 Max</span>
            </div>
          </div>

          {/* Slider 2: Average Sales per Downline */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Avg Sales Per Partner</span>
              </span>
              <span className="text-base font-bold text-emerald-400 font-display">{avgDownlineSales} Sales</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={avgDownlineSales}
              onChange={(e) => setAvgDownlineSales(Number(e.target.value))}
              className="w-full h-2 bg-[#111722] rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>1 Sale</span>
              <span>3 (Unlocks 2 Pass-ups)</span>
              <span>15 Sales</span>
            </div>
          </div>

          {/* Slider 3: Depth Tiers */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pass-Up Depth Generations</span>
              </span>
              <span className="text-base font-bold text-cyan-400 font-display">{depthTier} Generations</span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setDepthTier(level)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    depthTier === level
                      ? 'gold-btn-gradient text-slate-950 shadow-md'
                      : 'bg-[#111722] border border-[#212c40] text-slate-400 hover:text-white'
                  }`}
                >
                  Gen {level}
                </button>
              ))}
            </div>
          </div>

          {/* Rule Reminder Pill */}
          <div className="p-3.5 rounded-2xl bg-[#07090e] border border-[#1c2436] text-[11px] font-mono text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Info className="w-3.5 h-3.5" />
              <span>2-Up P2P Protocol Rules</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              • Sale #1 & #3 pass up to your sponsor (₹{(unitPrice * 2).toLocaleString('en-IN')} qualification).
              <br />
              • Sale #2 & #4+ give you <strong>100% direct instant ₹{unitPrice.toLocaleString('en-IN')}</strong>.
              <br />
              • Every kept member sends you their <strong>1st & 3rd sale</strong>!
            </p>
          </div>
        </div>

        {/* Results & Compounding Projection Column (2 cols on lg) */}
        <div className="p-6 rounded-3xl bg-[#0c1017] border border-[#1c2436] shadow-xl space-y-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            {/* Total Income Showcase Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#121927] to-emerald-500/10 border-2 border-amber-500/40 relative overflow-hidden shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    Projected Total P2P Earnings
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight">
                      ₹{calculation.totalIncome.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">100% Direct UPI</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    From {calculation.directKept} Kept Directs + {calculation.totalPassupsReceived} Pass-Up Inflows across {depthTier} tiers
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0 bg-[#07090e]/80 p-3.5 rounded-2xl border border-[#212c40]">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Total Pipeline Team</p>
                  <p className="text-xl sm:text-2xl font-bold font-display text-amber-400 mt-0.5">
                    {calculation.totalTeamMembers} IDs
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">
                    {calculation.totalPassupsReceived} Paying Pass-Ups
                  </p>
                </div>
              </div>
            </div>

            {/* Tier Breakdown Visual Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {/* Direct Sales Kept */}
              <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1c2436] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Direct Kept (Sales #2, #4+)</span>
                  </div>
                  <p className="text-xs text-slate-400">{calculation.directKept} direct partners × ₹{unitPrice.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-cyan-400 font-mono">({calculation.passedToUpline} sales passed to upline)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-display text-emerald-400">
                    ₹{calculation.directIncome.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    Direct Tier
                  </span>
                </div>
              </div>

              {/* Gen 2 Inflow */}
              <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1c2436] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Gen 2 Pass-Ups (1st & 3rd)</span>
                  </div>
                  <p className="text-xs text-slate-400">{calculation.level2Passups} pass-up payments × ₹{unitPrice.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-amber-300 font-mono">from {calculation.directKept} active kept directs</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-display text-amber-400">
                    ₹{calculation.level2Income.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30">
                    Gen 2 Inflow
                  </span>
                </div>
              </div>

              {/* Gen 3 Inflow */}
              {depthTier >= 3 && (
                <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1c2436] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400 font-bold">
                      <Zap className="w-4 h-4" />
                      <span>Gen 3 Pass-Ups (Compounding)</span>
                    </div>
                    <p className="text-xs text-slate-400">{calculation.level3Passups} pass-ups × ₹{unitPrice.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-purple-300 font-mono">from Gen 2 pass-up partners</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-display text-purple-400">
                      ₹{calculation.level3Income.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                      Gen 3 Inflow
                    </span>
                  </div>
                </div>
              )}

              {/* Gen 4 Inflow */}
              {depthTier >= 4 && (
                <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1c2436] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-bold">
                      <TrendingUp className="w-4 h-4" />
                      <span>Gen 4 Pass-Ups (Exponential)</span>
                    </div>
                    <p className="text-xs text-slate-400">{calculation.level4Passups} pass-ups × ₹{unitPrice.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-cyan-300 font-mono">from Gen 3 partners</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-display text-cyan-400">
                      ₹{calculation.level4Income.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                      Gen 4 Inflow
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Summary Bar */}
          <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1c2436] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Direct Bank Settlement: No admin cut, 0% platform deductions.</span>
            </div>
            <div className="text-amber-400 font-bold">
              Rate: ₹{unitPrice.toLocaleString('en-IN')} / P2P Settlement
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
