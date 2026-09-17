import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  RefreshCw, 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserPassupLogs } from '../lib/supabase';
import { PassupLog } from '../types';

export const PassupLogs: React.FC = () => {
  const { user, packagePrice } = useAuth();
  const unitPrice = packagePrice;
  const [logs, setLogs] = useState<PassupLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getUserPassupLogs(user.id);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching passup logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user?.id]);

  const getReasonBadge = (reason: string) => {
    if (reason === 'SALE_1_PASSUP' || reason === '1ST_SALE' || reason.includes('Sale #1')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-400 border border-teal-500/30 text-[10px] font-mono font-semibold">
          SALE #1 PASS-UP (QUALIFIER)
        </span>
      );
    }
    if (reason === 'SALE_3_PASSUP' || reason === '3RD_SALE' || reason.includes('Sale #3')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-500/30 text-[10px] font-mono font-semibold">
          SALE #3 PASS-UP (QUALIFIER)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-[#091122] text-slate-300 border border-slate-700 text-[10px] font-mono">
        {reason}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b0f19] via-[#101726] to-[#07090e] border border-[#1e2a40] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
            <GitFork className="w-3.5 h-3.5 text-amber-400" />
            <span>Verifiable Pass-Up Cryptographic Trail</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Pass-Up Audit Ledger
          </h2>
          <p className="text-sm text-slate-300 max-w-xl">
            Complete audit trail of all Sales #1 & #3 pass-ups received from your downline or passed to your qualifying upline.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111722] border border-[#212c40] text-slate-300 hover:text-[#f3c368] hover:border-amber-500/40 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
          <span>Sync Audit Trail</span>
        </button>
      </div>

      {/* Educational Rule Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-[#091122]/70 border border-teal-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-teal-400 font-bold">
            <span>RULE 1: SALE #1</span>
            <span className="w-2 h-2 rounded-full bg-teal-400" />
          </div>
          <h4 className="text-sm font-bold text-white">First Sale Qualification</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your 1st sale is passed up to your qualifying sponsor to initialize your active qualification ID.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#091122]/70 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-purple-400 font-bold">
            <span>RULE 2: SALE #3</span>
            <span className="w-2 h-2 rounded-full bg-purple-400" />
          </div>
          <h4 className="text-sm font-bold text-white">Third Sale Permanent Lock</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your 3rd sale passes up to finalize qualification. From sale #4, #5, #6 onwards to infinity, all ₹{unitPrice.toLocaleString('en-IN')} payouts belong 100% directly to you!
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#091122]/70 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400 font-bold">
            <span>RULE 3: PASSIVE DOWNLINE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <h4 className="text-sm font-bold text-white">Infinite Downline Pass-Ups</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every direct member you sponsor passes their 1st & 3rd sales (₹{unitPrice.toLocaleString('en-IN')} each) straight to you, with zero cuts or cycle reset deductions.
          </p>
        </div>
      </div>

      {/* Pass-Up Logs Table */}
      <div className="p-6 rounded-3xl bg-[#091122]/70 backdrop-blur-xl border border-emerald-500/15 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#050811] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Sale Number</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Pass-Up Trigger Reason</th>
                <th className="py-3.5 px-4">Original Referrer</th>
                <th className="py-3.5 px-4">Passed Up To</th>
                <th className="py-3.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading audit records from database...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <GitFork className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No pass-up events recorded yet</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                      Pass-up events are automatically created when you or downline partners process sales #2, #4 or #11.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const isReceived = log.passed_to_name === user?.full_name;
                  return (
                    <tr key={index} className="hover:bg-[#091122]/50 transition-colors">
                      {/* Sale # */}
                      <td className="py-4 px-4 font-mono font-bold text-white">
                        Sale #{log.sale_number}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-bold font-display text-emerald-400">
                        ₹{Number(log.amount || unitPrice).toLocaleString('en-IN')}
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-4">
                        {getReasonBadge(log.passup_reason)}
                      </td>

                      {/* Original Referrer */}
                      <td className="py-4 px-4 font-semibold text-slate-200">
                        {log.original_referrer_name || 'Member ID'}
                      </td>

                      {/* Passed To */}
                      <td className="py-4 px-4">
                        <span className={`font-semibold ${isReceived ? 'text-emerald-400' : 'text-teal-300'}`}>
                          {log.passed_to_name || 'Qualifying Upline'} {isReceived && '(YOU)'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 font-mono text-slate-400">
                        {new Date(log.date).toLocaleString('en-IN', {
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
