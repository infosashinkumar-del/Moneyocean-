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
import { supabase, settleP2PSale } from '../lib/supabase';
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

  // Simulator / manual action form
  const [simOrderId, setSimOrderId] = useState('');
  const [simUtr, setSimUtr] = useState('');
  const [simulating, setSimulating] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
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
      const res = await settleP2PSale(simOrderId.trim(), 'SUCCESS', generatedUtr);

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
                  const limit = Number(key.monthly_limit || 75000);
                  const rec = Number(key.monthly_received_amount || 0);
                  const pct = Math.min(100, Math.round((rec / limit) * 100));

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
