import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  RefreshCw, 
  ArrowDownLeft, 
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserTransactions } from '../lib/supabase';
import { Transaction } from '../types';

export const TransactionHistory: React.FC = () => {
  const { user, packagePrice } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');

  const fetchTransactions = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getUserTransactions(user.id, 25);
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.utr_number && tx.utr_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.buyer?.full_name && tx.buyer.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.beneficiary?.full_name && tx.beneficiary.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || tx.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b0f19] via-[#101726] to-[#07090e] border border-[#1e2a40] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            <span>P2P Cryptographic Transactions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Transaction Ledger History
          </h2>
          <p className="text-sm text-slate-300 max-w-xl">
            Live record of all incoming peer-to-peer payments, activation orders, and verified UTR bank reference codes.
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111722] border border-[#212c40] text-slate-300 hover:text-[#f3c368] hover:border-amber-500/40 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, UTR, or Name..."
            className="w-full pl-10 pr-4 py-2 bg-[#07090e] border border-[#1c2436] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['ALL', 'SUCCESS', 'PENDING', 'FAILED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'gold-btn-gradient text-slate-950 font-bold'
                  : 'bg-[#07090e] text-slate-400 hover:text-white border border-[#1c2436]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="p-6 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#050811] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Order ID & Type</th>
                <th className="py-3.5 px-4">Amount (INR)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">UTR Reference</th>
                <th className="py-3.5 px-4">Role / Flow</th>
                <th className="py-3.5 px-4">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading transactions from live database...</span>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No transactions recorded yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Transactions will appear automatically once referral payments are initiated.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIncoming = tx.beneficiary_user_id === user?.id;
                  return (
                    <tr key={tx.id} className="hover:bg-[#091122]/50 transition-colors">
                      {/* Order ID */}
                      <td className="py-4 px-4 font-mono">
                        <span className="text-white font-bold block">{tx.order_id}</span>
                        <span className="text-[10px] text-teal-400">{tx.transaction_type}</span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <span className="text-sm font-bold font-display text-white">
                          ₹{Number(tx.amount || packagePrice || 5000).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {tx.payment_status === 'SUCCESS' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-semibold font-mono text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> SETTLED
                          </span>
                        )}
                        {tx.payment_status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-500/30 font-semibold font-mono text-[10px]">
                            <Clock className="w-3 h-3 animate-spin" /> PENDING
                          </span>
                        )}
                        {tx.payment_status === 'FAILED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-500/30 font-semibold font-mono text-[10px]">
                            <XCircle className="w-3 h-3" /> FAILED
                          </span>
                        )}
                        {tx.payment_status === 'EXPIRED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#050811] text-slate-400 border border-slate-700 font-semibold font-mono text-[10px]">
                            EXPIRED
                          </span>
                        )}
                      </td>

                      {/* UTR */}
                      <td className="py-4 px-4 font-mono text-slate-300">
                        {tx.utr_number ? (
                          <span className="text-emerald-400 font-semibold">{tx.utr_number}</span>
                        ) : (
                          <span className="text-slate-500 italic">--</span>
                        )}
                      </td>

                      {/* Role Flow */}
                      <td className="py-4 px-4">
                        {isIncoming ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> Received Payout
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-teal-400 font-medium">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Buyer Payment
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 font-mono text-slate-400">
                        {new Date(tx.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
