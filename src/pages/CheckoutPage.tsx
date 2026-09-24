import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Check, 
  Copy, 
  RefreshCw, 
  Zap, 
  Clock, 
  UserCheck,
  TrendingUp,
  Receipt,
  FileText,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { 
  supabase, 
  generateP2PCheckout, 
  checkZapUPIAutoStatus 
} from '../lib/supabase';
import { showToast } from '../components/Toast';
import { CheckoutResponse } from '../types';

interface CheckoutPageProps {
  onNavigateDashboard: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigateDashboard }) => {
  const { user, authUser, refreshUserData, packagePrice, platformConfig } = useAuth();
  const lockMinutes = Number(platformConfig?.reservation_lock_minutes || 8);
  const [loading, setLoading] = useState(false);
  const [slotLockedError, setSlotLockedError] = useState<string | null>(null);

  const [orderId, setOrderId] = useState<string>('');
  const [payId, setPayId] = useState<string>('');
  const [amount, setAmount] = useState<number>(packagePrice || 500);
  const [dynamicZapKey, setDynamicZapKey] = useState<string>(platformConfig?.fallback_zap_key || '');
  const [paymentUrl, setPaymentUrl] = useState<string>('');

  const [routingInfo, setRoutingInfo] = useState<{
    beneficiary_name?: string;
    reason?: string;
    beneficiary_id?: string;
    beneficiary_referral_code?: string;
    is_passup?: boolean;
    sale_number?: number;
    sponsor_name?: string;
    sponsor_code?: string;
  }>({
    beneficiary_name: '',
    reason: '',
    beneficiary_id: '',
    beneficiary_referral_code: '',
    is_passup: false,
    sale_number: 1,
    sponsor_name: '',
    sponsor_code: ''
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(lockMinutes * 60);
  const [statusText, setStatusText] = useState<string>('Connecting to ZapUPI Gateway...');
  const [statusState, setStatusState] = useState<'' | 'success' | 'failed'>('');
  const [copiedOrderId, setCopiedOrderId] = useState<boolean>(false);

  const [dialog, setDialog] = useState<{
    open: boolean;
    type: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
    title: string;
    message: string;
  }>({
    open: false,
    type: 'SUCCESS',
    title: 'Payment Received',
    message: 'Your payment has been received successfully.'
  });

  const pollActiveRef = useRef<boolean>(true);
  const pollBusyRef = useRef<boolean>(false);
  const finalHandledRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoLaunchedRef = useRef<boolean>(false);

  const initSession = async () => {
    if (!authUser?.id) return null;
    if (isInitializingRef.current) return null;
    isInitializingRef.current = true;
    setLoading(true);
    setSlotLockedError(null);
    finalHandledRef.current = false;
    pollActiveRef.current = true;
    setRemainingSeconds(lockMinutes * 60);
    setStatusText('Allocating reservation slot...');
    setStatusState('');
    setDialog({ open: false, type: 'SUCCESS', title: '', message: '' });

    try {
      let sponsorCode = '';
      if (user?.sponsor_id) {
        try {
          const { data: sponsor } = await supabase
            .from('users')
            .select('referral_code')
            .eq('id', user.sponsor_id)
            .maybeSingle();
          if (sponsor?.referral_code) {
            sponsorCode = sponsor.referral_code;
          }
        } catch (sErr) {
          console.warn('Sponsor lookup note:', sErr);
        }
      }

      if (!sponsorCode) {
        sponsorCode = user?.referral_code || 'UP_GENESIS';
      }

      const res: CheckoutResponse = await generateP2PCheckout(sponsorCode, authUser.id);
      if (res.error_code === 'SLOT_IN_PROGRESS') {
        const errMsg = res.message || `Payment slot is currently locked by another buyer. Please retry in ${lockMinutes} minutes.`;
        setSlotLockedError(errMsg);
        setLoading(false);
        return null;
      }

      if (res.success && res.order_id) {
        setOrderId(res.order_id);
        const orderAmt = Number(res.payment?.amount_inr !== undefined ? res.payment.amount_inr : (res.amount !== undefined ? res.amount : packagePrice));
        setAmount(orderAmt);
        const activeZap = res.zap_key || res.payment?.zap_key || res.beneficiary_zap_key || platformConfig?.fallback_zap_key || '';
        setDynamicZapKey(activeZap);

        const rName = res.routing_info?.beneficiary_name || res.beneficiary_name || 'Admin Beneficiary';
        const rPassup = Boolean(res.is_passup ?? res.routing_info?.is_passup);
        const rReason = res.routing_info?.reason || res.passup_reason || (rPassup ? 'Pass-up to Qualifying Upline' : 'Direct Referral Commission');
        const rCode = res.routing_info?.beneficiary_referral_code || res.beneficiary_referral_code || '';
        const rId = res.routing_info?.beneficiary_id || res.beneficiary_id || '';
        const rSaleNum = res.routing_info?.sale_number || res.sale_number || 1;

        setRoutingInfo({
          beneficiary_name: rName,
          reason: rReason,
          beneficiary_id: rId,
          beneficiary_referral_code: rCode,
          is_passup: rPassup,
          sale_number: rSaleNum,
          sponsor_code: sponsorCode
        });

        if (res.pay_id) setPayId(res.pay_id);
        if (res.payment_url) setPaymentUrl(res.payment_url);

        return res;
      } else {
        throw new Error(res.message || 'Could not allocate reservation slot');
      }
    } catch (err: any) {
      console.error('Session init error:', err);
      setSlotLockedError(err.message || 'Failed to initialize payment slot. Please retry.');
      showToast('error', 'Checkout Init Failed', err.message || 'Failed to initialize payment');
      return null;
    } finally {
      setLoading(false);
      isInitializingRef.current = false;
    }
  };

  const handleFinalStatus = async (status: 'SUCCESS' | 'FAILED' | 'TIMEOUT', customUtr?: string) => {
    if (finalHandledRef.current) return;
    finalHandledRef.current = true;
    pollActiveRef.current = false;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (typeof window !== 'undefined' && (window as any).Swal) {
      try { (window as any).Swal.close(); } catch {}
    }

    if (status === 'SUCCESS') {
      setStatusText('Payment Confirmed - Activating ID...');
      setStatusState('success');
      setDialog({
        open: true,
        type: 'SUCCESS',
        title: 'Payment Received',
        message: `Your ₹${Number(amount).toLocaleString('en-IN')} P2P payment has been confirmed. Activating your UltraPay ID...`
      });
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#10b981', '#dfa938', '#34d399', '#f6cb56']
      });
      showToast('success', 'Payment Received', 'Payment confirmed! Activating account and syncing ledger...');
      try {
        await refreshUserData();
      } catch (err) {
        console.warn('Dashboard sync notice:', err);
      }
      setTimeout(() => {
        onNavigateDashboard();
      }, 2000);
    } else if (status === 'FAILED') {
      setStatusText('Payment Incomplete');
      setStatusState('failed');
      showToast('error', 'Payment Incomplete', 'Returning to dashboard...');
      setTimeout(() => {
        onNavigateDashboard();
      }, 400);
    } else {
      setStatusText('Payment Timeout');
      setStatusState('failed');
      showToast('info', 'Session Expired', 'Returning to dashboard...');
      setTimeout(() => {
        onNavigateDashboard();
      }, 400);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ZapUPI) {
      (window as any).ZapUPI.setPaymentCallbacks({
        onSuccess: (completedOrderId: string) => {
          handleFinalStatus('SUCCESS', `ZAP_KIT_${completedOrderId}`);
        },
        onFailed: () => handleFinalStatus('FAILED'),
        onTimeout: () => handleFinalStatus('TIMEOUT')
      });
    }
  }, [orderId]);

  const launchZapUPI = (payUrl?: string, zKey?: string, oId?: string, amt?: number) => {
    const targetUrl = payUrl || paymentUrl;
    const activeKey = (zKey || dynamicZapKey || platformConfig?.fallback_zap_key || '').trim();
    const targetOrderId = (oId || orderId).trim();
    const targetAmount = amt !== undefined ? amt : (amount || Number(packagePrice || platformConfig?.package_price || 500));

    setStatusText('Redirecting to ZapUPI Transaction Page...');

    if (targetUrl && typeof window !== 'undefined' && (window as any).ZapUPI) {
      try {
        (window as any).ZapUPI.loadPayment(targetUrl);
        setStatusText('ZapUPI gateway active. Complete payment...');
        return true;
      } catch (e) {
        console.warn('ZapUPI loadPayment note:', e);
      }
    }

    if (targetUrl) {
      window.location.href = targetUrl;
      return true;
    }

    if (targetOrderId && activeKey && typeof window !== 'undefined' && (window as any).ZapUPI) {
      try {
        (window as any).ZapUPI.createOrder(
          {
            zap_key: activeKey,
            order_id: targetOrderId,
            amount: Number(targetAmount).toFixed(2),
            customer_mobile: user?.mobile || '',
            remark: `UltraPay|${user?.referral_code || 'P2P'}`
          },
          {
            onResponse: (url: string) => {
              if ((window as any).ZapUPI) {
                (window as any).ZapUPI.loadPayment(url);
                setStatusText('ZapUPI gateway active. Complete payment...');
              } else {
                window.location.href = url;
              }
            },
            onError: (errMsg: string) => {
              setStatusText('Waiting for payment...');
              showToast('error', 'ZapUPI Gateway Error', errMsg || 'Failed to initiate payment.');
            }
          }
        );
        return true;
      } catch (zapErr) {
        console.warn('ZapUPI createOrder note:', zapErr);
      }
    }

    showToast('info', 'Gateway Connecting', 'Opening ZapUPI payment page...');
    return false;
  };

  // Direct Auto-Launch on BOTH Desktop AND Mobile:
  // Immediately initialize session and redirect directly to ZapUPI transaction page!
  useEffect(() => {
    if (authUser?.id && !autoLaunchedRef.current && !orderId && !loading && !slotLockedError) {
      autoLaunchedRef.current = true;
      (async () => {
        const res = await initSession();
        if (res && res.success) {
          const targetPaymentUrl = res.payment_url || paymentUrl;
          const targetZapKey = res.zap_key || res.payment?.zap_key || dynamicZapKey;
          const targetOrderId = res.order_id;
          const targetAmount = Number(res.payment?.amount_inr || res.amount || packagePrice || platformConfig?.package_price || 500);
          launchZapUPI(targetPaymentUrl, targetZapKey, targetOrderId, targetAmount);
        }
      })();
    }
  }, [authUser?.id]);

  // Reservation countdown timer
  useEffect(() => {
    if (loading || slotLockedError || finalHandledRef.current) return;
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          handleFinalStatus('TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [loading, slotLockedError]);

  // Safe Database Polling Every 5 Seconds
  useEffect(() => {
    if (!orderId || finalHandledRef.current) return;
    const pollDatabase = async () => {
      if (finalHandledRef.current) return;
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('payment_status, utr_number')
          .eq('order_id', orderId)
          .maybeSingle();
        if (!error && data && data.payment_status === 'SUCCESS') {
          handleFinalStatus('SUCCESS', data.utr_number);
        }
      } catch {}
    };
    const dbPollInterval = setInterval(pollDatabase, 5000);
    pollDatabase();

    const channel = supabase
      .channel(`tx-check-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          if (payload.new && payload.new.payment_status === 'SUCCESS') {
            handleFinalStatus('SUCCESS', payload.new.utr_number);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(dbPollInterval);
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Auto-Check Polling via Gateway Every 5 Seconds
  useEffect(() => {
    if (!payId || finalHandledRef.current) return;
    const autoPoll = async () => {
      if (!pollActiveRef.current || pollBusyRef.current || finalHandledRef.current) {
        return;
      }
      pollBusyRef.current = true;
      try {
        const st = await checkZapUPIAutoStatus(payId);
        if (st === 'SUCCESS') {
          handleFinalStatus('SUCCESS');
          return;
        } else if (st === 'FAILED') {
          handleFinalStatus('FAILED');
          return;
        } else if (st === 'TIMEOUT') {
          handleFinalStatus('TIMEOUT');
          return;
        }
      } catch {
      } finally {
        pollBusyRef.current = false;
      }
    };
    const pollInterval = setInterval(autoPoll, 5000);
    autoPoll();
    return () => clearInterval(pollInterval);
  }, [payId]);

  const handleCopyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    showToast('success', 'Order ID Copied', orderId);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isPassup = routingInfo.is_passup;

  return (
    <div className="min-h-screen bg-[#07090e] gold-stars-bg flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none selection:bg-[#e5a93c] selection:text-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {slotLockedError ? (
        <div className="w-full max-w-md bg-[#0c111c] border border-rose-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold font-display text-white">Payment Slot Reserved</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">{slotLockedError}</p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                setSlotLockedError(null);
                autoLaunchedRef.current = false;
                initSession();
              }}
              className="w-full py-3.5 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Retry Allocation
            </button>
            <button
              onClick={onNavigateDashboard}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-mono transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : (
        /* Unified Direct ZapUPI Transaction Card (Desktop & Mobile) */
        <div className="w-full max-w-[480px] bg-[#0c121e]/95 border border-amber-500/35 rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-black/90 relative overflow-hidden backdrop-blur-2xl space-y-5 z-10 card-3d-glow animate-in fade-in duration-300">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-[#1b2538] pb-4">
            <button
              onClick={onNavigateDashboard}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                100% P2P
              </span>
              <div 
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 tabular-nums ${
                  remainingSeconds < 120 
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/40 animate-pulse' 
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(remainingSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Brand & Price Header */}
          <div className="text-center space-y-1.5 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Direct ZapUPI Gateway</span>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold font-display gold-gradient-text tracking-tight tabular-nums pt-1">
              ₹{Number(amount || packagePrice || 500).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div className="text-xs text-slate-400 font-mono flex items-center justify-center gap-1.5">
              <span>Order ID: <strong className="text-slate-200 font-bold">{orderId || 'Initializing...'}</strong></span>
              {orderId && (
                <button
                  onClick={handleCopyOrderId}
                  className="text-slate-400 hover:text-amber-400 cursor-pointer transition-colors p-1"
                  title="Copy Order ID"
                >
                  {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Beneficiary Node Details */}
          <div className="p-3.5 rounded-2xl bg-[#070b14] border border-[#1b2538] flex items-center justify-between text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-500">Beneficiary Recipient</div>
              <div className="font-bold text-white text-sm truncate">{routingInfo.beneficiary_name || 'Admin Beneficiary'}</div>
            </div>
            <div className="text-right">
              <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold ${
                isPassup 
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/30' 
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isPassup ? '2-Up Pass-Up' : '100% Direct'}
              </span>
            </div>
          </div>

          {/* Live Status Indicator */}
          <div className="flex items-center gap-2.5 text-xs text-slate-300 font-mono px-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusState === 'success'
                  ? 'bg-emerald-400 ring-4 ring-emerald-500/20'
                  : statusState === 'failed'
                  ? 'bg-rose-500 ring-4 ring-rose-500/20'
                  : 'bg-amber-400 ring-4 ring-amber-500/20 animate-pulse'
              }`}
            />
            <span className="font-medium text-[11px] truncate text-slate-200">
              {statusText}
            </span>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              id="directPayButton"
              onClick={() => {
                if (!orderId) {
                  initSession().then((res) => {
                    if (res && res.success) {
                      launchZapUPI(res.payment_url, res.zap_key, res.order_id, res.amount);
                    }
                  });
                } else {
                  launchZapUPI();
                }
              }}
              disabled={loading}
              className="w-full text-center py-4 px-4 rounded-xl font-bold text-sm sm:text-base gold-btn-gradient text-slate-950 shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 font-display tracking-wide"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
              ) : (
                <Zap className="w-5 h-5 fill-slate-950" />
              )}
              <span>Proceed to ZapUPI Transaction Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onNavigateDashboard}
              className="w-full py-3 rounded-xl bg-[#070b14] hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono font-medium transition-all cursor-pointer"
            >
              Cancel & Return to Dashboard
            </button>
          </div>

          <div className="text-[11px] text-slate-400 text-center font-mono leading-relaxed pt-1 border-t border-[#182130]">
            ⚡ Direct ZapUPI opens PhonePe, Google Pay, Paytm & BHIM seamlessly.<br />
            ID activates instantly upon transaction completion.
          </div>
        </div>
      )}

      {/* Success Dialog Modal */}
      {dialog.open && dialog.type === 'SUCCESS' && (
        <div 
          id="dialog"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="bg-[#0c121e] border border-amber-500/40 w-full max-w-[360px] rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div 
              id="dialogIcon"
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-lg bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400"
            >
              ✓
            </div>
            <div className="space-y-1.5">
              <h3 id="dialogTitle" className="text-xl font-bold font-display text-white">
                {dialog.title}
              </h3>
              <p id="dialogMessage" className="text-xs text-slate-300 leading-relaxed font-mono">
                {dialog.message}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onNavigateDashboard}
                className="w-full py-3.5 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer font-mono"
              >
                Enter Your Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
