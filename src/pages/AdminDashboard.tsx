import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  GitFork, 
  Receipt, 
  Key, 
  RefreshCw, 
  Zap,
  Play
} from 'lucide-react';
import { supabase, simulateAdminSettlement, getPlatformConfigs, updatePlatformConfig } from '../lib/supabase';
import { StatCard } from '../components/StatCard';
import { showToast } from '../components/Toast';

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [inactiveUsersCount, setInactiveUsersCount] = useState<number>(0);
  const [adminPassupVolume, setAdminPassupVolume] = useState<number>(0);

  const [globalTransactions, setGlobalTransactions] = useState<any[]>([]);
  const [merchantKeysList, setMerchantKeysList] = useState<any[]>([]);
  const [, setGlobalUsers] = useState<any[]>([]);

  // Platform Configs (100% Dynamic - Zero Hardcoding)
  const [fallbackZapKey, setFallbackZapKey] = useState('');
  const [packagePrice, setPackagePrice] = useState<number>(0);
  const [reservationLockMinutes, setReservationLockMinutes] = useState<number>(8);
  const [platformLaunchDate, setPlatformLaunchDate] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Simulator / manual action form
  const [simOrderId, setSimOrderId] = useState('');
  const [simUtr, setSimUtr] = useState('');
  const [simulating, setSimulating] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 0. Fetch Live Platform Configs
      try {
        const config = await getPlatformConfigs();
        setFallbackZapKey(config.fallback_zap_key || '');
        setPackagePrice(Number(config.package_price || 0));
        setReservationLockMinutes(Number(config.reservation_lock_minutes || 8));
        setPlatformLaunchDate(config.platform_launch_date || config.referral_cutoff_date || '');
      } catch (cErr) {
        console.warn('Config fetch notice:', cErr);
      }

      // 1. Fetch Users Summary
      let allUsers: any[] = [];
      try {
        const { data: usersData, error: uErr } = await supabase
          .from('users')
          .select('*');
        if (!uErr && usersData && Array.isArray(usersData)) {
          allUsers = usersData;
        }
      } catch (uEx) {
        console.warn('Admin users fetch error:', uEx);
      }

      setGlobalUsers(allUsers);

      const active = allUsers.filter((u) => u.is_active).length;
      const inactive = allUsers.length - active;
      setActiveUsersCount(active);
      setInactiveUsersCount(inactive);

      // Total earnings sum
      const vol = allUsers.reduce((sum, u) => sum + Number(u.total_income || 0), 0);
      setTotalVolume(vol);

      // 2. Fetch Global Transactions
      try {
        const { data: txData, error: txErr } = await supabase
          .from('transactions')
          .select(`
            *,
            buyer:buyer_user_id ( full_name, email, referral_code ),
            beneficiary:beneficiary_user_id ( full_name, email, referral_code )
          `)
          .order('created_at', { ascending: false })
          .limit(20);
        if (!txErr && txData && Array.isArray(txData)) {
          setGlobalTransactions(txData);
        } else {
          setGlobalTransactions([]);
        }
      } catch {
        setGlobalTransactions([]);
      }

      // 3. Fetch Merchant ZapKey Volume
      try {
        const { data: mData, error: mErr } = await supabase
          .from('user_merchant_keys')
          .select(`
            *,
            user:user_id ( full_name, email, referral_code )
          `)
          .order('monthly_received_amount', { ascending: false });
        if (!mErr && mData && Array.isArray(mData)) {
          setMerchantKeysList(mData);
        } else {
          setMerchantKeysList([]);
        }
      } catch {
        setMerchantKeysList([]);
      }

      // 4. Calculate Pass-Up Volume Routed to Top Node / Admin
      try {
        const { data: passups, error: passupErr } = await supabase
          .from('passup_logs')
          .select('*');
        const passupList = (!passupErr && passups && Array.isArray(passups)) ? passups : [];
        const passupSum = passupList.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        setAdminPassupVolume(passupSum);
      } catch {
        setAdminPassupVolume(0);
      }

    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simOrderId.trim()) {
      showToast('error', 'Order ID Required', 'Please enter a valid order ID');
      return;
    }

    setSimulating(true);
    try {
      const generatedUtr = simUtr.trim() || `UTR${Date.now()}`;
      const res = await simulateAdminSettlement(simOrderId.trim(), generatedUtr);

      if (res.success) {
        showToast('success', 'Order Settled via Admin', `Order ${simOrderId} successfully marked settled with UTR ${generatedUtr}`);
        setSimOrderId('');
        setSimUtr('');
        await fetchAdminData();
      } else {
        throw new Error(res.message || 'Settlement failed');
      }
    } catch (err: any) {
      showToast('error', 'Manual Settlement Failed', err.message);
    } finally {
      setSimulating(false);
    }
  };

  const handleSavePlatformConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const resKey = await updatePlatformConfig('fallback_zap_key', fallbackZapKey.trim());
      const resPrice = await updatePlatformConfig('package_price', Number(packagePrice));
      const resLock = await updatePlatformConfig('reservation_lock_minutes', Number(reservationLockMinutes));
      const resDate = await updatePlatformConfig('platform_launch_date', platformLaunchDate.trim());

      if (resKey.success && resPrice.success) {
        showToast('success', 'Platform Config Saved', 'Live configs updated dynamically in platform_configs.');
        await fetchAdminData();
      } else {
        throw new Error(resKey.message || resPrice.message || resLock.message || resDate.message || 'Failed to update config in database');
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b0f19] via-[#101726] to-[#07090e] border border-[#1e2a40] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-mono font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Top Node Overseer</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Master Administrator Portal
          </h2>
          <p className="text-sm text-slate-300 max-w-xl">
            Live platform oversight, global transaction stream, ZapKey monthly limit enforcement, and fallback pass-up monitor.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111722] border border-[#212c40] text-slate-300 hover:text-[#f3c368] hover:border-amber-500/40 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
          <span>Sync Global System</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Platform P2P Volume"
          value={`₹${totalVolume.toLocaleString('en-IN')}`}
          subtitle="Total Verified Settlements"
          icon={TrendingUp}
          variant="purple"
          badge="Global Gross"
        />

        <StatCard
          title="Active Members"
          value={activeUsersCount}
          subtitle={`Out of ${activeUsersCount + inactiveUsersCount} registered nodes`}
          icon={UserCheck}
          variant="emerald"
          badge="Active Nodes"
          badgeType="success"
        />

        <StatCard
          title="Inactive Nodes"
          value={inactiveUsersCount}
          subtitle="Pending slot payment"
          icon={UserX}
          variant="amber"
          badge="Pending Activation"
          badgeType="warning"
        />

        <StatCard
          title="Total Pass-Up Volume"
          value={`₹${adminPassupVolume.toLocaleString('en-IN')}`}
          subtitle="1st & 3rd 2-Up Pass-Up Flow"
          icon={GitFork}
          variant="cyan"
          badge="Network Flow"
        />
      </div>

      {/* Merchant ZapKey Limit Monitor */}
      <div className="p-6 rounded-3xl bg-[#091122]/70 backdrop-blur-xl border border-emerald-500/15 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold font-display text-white">
              Merchant ZapKey Volume Monitor (Monthly Limit: ₹75,000)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {merchantKeysList.length} Active Keys Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#050811] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Referral Code</th>
                <th className="py-3 px-4">ZapKey</th>
                <th className="py-3 px-4">Monthly Received</th>
                <th className="py-3 px-4">Limit Utilization</th>
                <th className="py-3 px-4">Key Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {merchantKeysList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No merchant keys registered yet</td>
                </tr>
              ) : (
                merchantKeysList.map((key) => {
                  const limit = Number(key.monthly_limit || 0);
                  const rec = Number(key.monthly_received_amount || 0);
                  const pct = limit > 0 ? Math.min(100, Math.round((rec / limit) * 100)) : 0;

                  return (
                    <tr key={key.id} className="hover:bg-[#091122]/50">
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        {key.user?.full_name || 'System Default'}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                        #{key.user?.referral_code || 'MASTER'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {key.zap_key?.substring(0, 14)}••••
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 font-sans">
                        ₹{rec.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 w-44">
                        <div className="w-full bg-[#050811] h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              pct > 85 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">{pct}% used</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {key.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px]">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-500/30 text-[10px]">
                            DISABLED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Platform Configuration (Zero Hardcoding) */}
      <div className="p-6 rounded-3xl bg-[#091122]/80 backdrop-blur-xl border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Key className="w-5 h-5" />
            <h3 className="text-base font-bold font-display text-white">
              Dynamic Platform Configuration (Database Stored • Zero Hardcoding)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-amber-300/80 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/30">
            platform_configs Live Table
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          The emergency fallback ZapKey and package pricing are fetched directly from your Supabase <code className="text-amber-300 font-mono">platform_configs</code> table. Members' direct payouts use their own registered merchant ZapKeys first; if unconfigured, this live fallback key is allocated.
        </p>

        <form onSubmit={handleSavePlatformConfig} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Fallback Admin ZapKey
            </label>
            <input
              type="text"
              required
              value={fallbackZapKey}
              onChange={(e) => setFallbackZapKey(e.target.value)}
              placeholder="e.g. ZapXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-amber-500/40 focus:border-amber-400 text-amber-300 font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Package Price (INR)
            </label>
            <input
              type="number"
              required
              min={1}
              value={packagePrice}
              onChange={(e) => setPackagePrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-amber-500/40 focus:border-amber-400 text-white font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Reservation Lock (Mins)
            </label>
            <input
              type="number"
              required
              min={1}
              max={60}
              value={reservationLockMinutes}
              onChange={(e) => setReservationLockMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-amber-500/40 focus:border-amber-400 text-white font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Platform Launch / Referral Cutoff Date
            </label>
            <input
              type="text"
              value={platformLaunchDate}
              onChange={(e) => setPlatformLaunchDate(e.target.value)}
              placeholder="e.g. 2026-10-21"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-amber-500/40 focus:border-amber-400 text-white font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2 Cols: Manual Settlement Simulator + Global Transactions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Manual Settlement Simulator (1 col) */}
        <div className="p-6 rounded-3xl bg-[#091122]/70 backdrop-blur-xl border border-emerald-500/20 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap className="w-5 h-5" />
            <h3 className="text-base font-bold font-display text-white">
              Webhook & Settlement Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Manually trigger the settlement RPC for test orders or stuck transactions to verify downline pass-ups and QSI locks.
          </p>

          <form onSubmit={handleSimulateWebhook} className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Order ID
              </label>
              <input
                type="text"
                required
                value={simOrderId}
                onChange={(e) => setSimOrderId(e.target.value)}
                placeholder="ORD_ABC1234XYZ"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-400 text-slate-100 font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                UTR Reference (Optional)
              </label>
              <input
                type="text"
                value={simUtr}
                onChange={(e) => setSimUtr(e.target.value)}
                placeholder="Leave blank for auto UTR"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050811] border border-slate-800 focus:border-emerald-400 text-slate-100 font-mono text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Execute Settle P2P Sale</span>
            </button>
          </form>
        </div>

        {/* Global Live Transaction Feed (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#091122]/70 backdrop-blur-xl border border-emerald-500/15 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Global Live Transaction Feed</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              Live Stream
            </span>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#050811] text-slate-400 font-mono uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Buyer</th>
                  <th className="py-2.5 px-3">Beneficiary</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {globalTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#091122]/50">
                    <td className="py-3 px-3 text-emerald-300 font-semibold">{tx.order_id}</td>
                    <td className="py-3 px-3 font-sans text-white">{tx.buyer?.full_name || 'Buyer Node'}</td>
                    <td className="py-3 px-3 font-sans text-teal-400">{tx.beneficiary?.full_name || 'Beneficiary'}</td>
                    <td className="py-3 px-3 font-sans font-bold text-white">₹{Number(tx.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        tx.payment_status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                      }`}>
                        {tx.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[10px]">
                      {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
