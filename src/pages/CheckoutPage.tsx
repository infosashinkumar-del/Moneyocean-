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
  CheckCircle2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { 
  supabase, 
  generateP2PCheckout, 
  checkZapUPIAutoStatus, 
  checkZapUPIUtr 
} from '../lib/supabase';
import { showToast } from '../components/Toast';
import { CheckoutResponse } from '../types';

interface CheckoutPageProps {
  onNavigateDashboard: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigateDashboard }) => {
  const { user, authUser, refreshUserData, packagePrice, platformConfig } = useAuth();
  const lockMinutes = Number(platformConfig?.reservation_lock_minutes || 8);
  const [checkoutStep, setCheckoutStep] = useState<'invoice' | 'payment'>('invoice');
  const [loading, setLoading] = useState(false);
  const [slotLockedError, setSlotLockedError] = useState<string | null>(null);

  const [orderId, setOrderId] = useState<string>('');
  const [payId, setPayId] = useState<string>('');
  const [amount, setAmount] = useState<number>(packagePrice || 0);
  const [dynamicZapKey, setDynamicZapKey] = useState<string>(platformConfig?.fallback_zap_key || '');
  const [paymentImageUrl, setPaymentImageUrl] = useState<string>('');
  const [upiButton, setUpiButton] = useState<string>('');
  const [paytmButton, setPaytmButton] = useState<string>('');
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
  const [statusText, setStatusText] = useState<string>(`Waiting for payment...`);
  const [statusState, setStatusState] = useState<'' | 'success' | 'failed'>('');
  const [utrInput, setUtrInput] = useState<string>('');
  const [manualCheckBusy, setManualCheckBusy] = useState<boolean>(false);
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
  const manualCheckBusyRef = useRef<boolean>(false);
  const finalHandledRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Yeh function ab sirf tab chalega jab user "Proceed to Pay" dabayega
  const initSession = async () => {
    if (!authUser?.id) return;
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    setLoading(true);
    setSlotLockedError(null);
    finalHandledRef.current = false;
    pollActiveRef.current = true;
    setRemainingSeconds(lockMinutes * 60);
    setStatusText(`Waiting for payment...`);
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
        sponsorCode = user?.referral_code || 'MO_GENESIS';
      }

      const res: CheckoutResponse = await generateP2PCheckout(sponsorCode, authUser.id);
      if (res.error_code === 'SLOT_IN_PROGRESS') {
        setSlotLockedError(res.message || `Payment slot is currently locked by another buyer. Please retry in ${lockMinutes} minutes.`);
        setLoading(false);
        return null; // Change from 'return false' to 'return null'
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
        if (res.payment_image_url) setPaymentImageUrl(res.payment_image_url);
        if (res.payment_url) setPaymentUrl(res.payment_url);

        const benUpi = res.payment?.upi_id || (rName ? `paytm.zap.${rName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'node'}@upi` : '');
        if (res.upi_button) {
          setUpiButton(res.upi_button);
        } else if (benUpi) {
          setUpiButton(`upi://pay?pa=${encodeURIComponent(benUpi)}&pn=${encodeURIComponent(rName || 'MoneyOcean')}&am=${orderAmt}&tr=${res.order_id}&cu=INR&tn=MoneyOcean_${res.order_id}`);
        }

        if (res.paytm_button) {
          setPaytmButton(res.paytm_button);
        } else if (benUpi) {
          setPaytmButton(`paytmmp://pay?pa=${encodeURIComponent(benUpi)}&pn=${encodeURIComponent(rName || 'MoneyOcean')}&am=${orderAmt}&tr=${res.order_id}&cu=INR`);
        }
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
      setStatusText('Payment Received - Activating...');
      setStatusState('success');
      setDialog({
        open: true,
        type: 'SUCCESS',
        title: 'Payment Received',
        message: `Your ₹${Number(amount).toLocaleString('en-IN')} P2P payment has been received. Activating your account via secure ledger...`
      });
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#10b981', '#14b8a6', '#34d399', '#fbbf24']
      });
      showToast('success', 'Payment Received', 'Payment confirmed! Activating account and syncing ledger...');
      try {
        await refreshUserData();
      } catch (err) {
        console.warn('Dashboard sync notice:', err);
      }
      setTimeout(() => {
        onNavigateDashboard();
      }, 2400);
    } else if (status === 'FAILED') {
      setStatusText('Payment Failed');
      setStatusState('failed');
      setDialog({
        open: true,
        type: 'FAILED',
        title: 'Payment Failed',
        message: 'The transaction could not be completed or was declined by the bank.'
      });
    } else {
      setStatusText('Payment Timeout');
      setStatusState('failed');
      setDialog({
        open: true,
        type: 'TIMEOUT',
        title: 'Payment Timeout',
        message: `The ${lockMinutes}-minute reservation session has expired. Please regenerate a new order.`
      });
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

  const handlePayClick = () => {
    const activeKey = dynamicZapKey || platformConfig?.fallback_zap_key || '';

    if (paymentUrl && typeof window !== 'undefined' && (window as any).ZapUPI) {
      try {
        (window as any).ZapUPI.loadPayment(paymentUrl);
        return;
      } catch (e) {
        console.warn('ZapUPI loadPayment note:', e);
      }
    }

    if (!orderId || !activeKey || !amount) {
      showToast('error', 'Payment Incomplete', 'Payment parameters are loading. Please wait a moment or scan the QR code directly.');
      return;
    }

    if (typeof window !== 'undefined' && (window as any).ZapUPI) {
      (window as any).ZapUPI.createOrder(
        {
          zap_key: activeKey.trim(),
          order_id: orderId.trim(),
          amount: Number(amount).toFixed(2),
          customer_mobile: user?.mobile || '',
          remark: `MoneyOcean|${user?.referral_code || 'P2P'}`
        },
        {
          onResponse: (url: string) => {
            if ((window as any).ZapUPI) {
              (window as any).ZapUPI.loadPayment(url);
            } else {
              window.location.href = url;
            }
          },
          onError: (errMsg: string) => {
            showToast('error', 'ZapUPI Gateway Error', errMsg || 'Failed to initiate payment. Scan the QR code to pay.');
          }
        }
      );
    } else {
      showToast('info', 'Pay with QR Code', 'Please scan the QR code above or use the 1-Tap UPI buttons.');
    }
  };

  useEffect(() => {
    if (checkoutStep !== 'payment' || loading || slotLockedError || finalHandledRef.current) return;
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
  }, [checkoutStep, loading, slotLockedError]);

  // Safe Database Polling Every 5 Seconds
  useEffect(() => {
    if (!orderId || checkoutStep !== 'payment' || finalHandledRef.current) return;
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
  }, [orderId, checkoutStep]);

  // Auto-Check Polling via Gateway Every 5 Seconds
  useEffect(() => {
    if (!payId || checkoutStep !== 'payment' || finalHandledRef.current) return;
    const autoPoll = async () => {
      if (!pollActiveRef.current || pollBusyRef.current || manualCheckBusyRef.current || finalHandledRef.current) {
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
  }, [payId, checkoutStep]);

  const handleVerifyUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCheckBusyRef.current || finalHandledRef.current) return;
    const utr = utrInput.trim();
    if (!utr) {
      setStatusText('Enter UTR to verify');
      showToast('error', 'UTR Required', 'Please enter your 12-digit UPI Bank Reference Number.');
      return;
    }
    manualCheckBusyRef.current = true;
    setManualCheckBusy(true);
    setStatusText('Verifying UTR with gateway...');
    try {
      if (payId) {
        const zapUtrStatus = await checkZapUPIUtr(payId, utr);
        if (zapUtrStatus === 'SUCCESS') {
          await handleFinalStatus('SUCCESS', utr);
          return;
        }
      }
      const { data: tx } = await supabase
        .from('transactions')
        .select('payment_status, utr_number')
        .eq('order_id', orderId)
        .maybeSingle();
      if (tx && tx.payment_status === 'SUCCESS') {
        await handleFinalStatus('SUCCESS', tx.utr_number || utr);
      } else {
        setStatusText('Payment verification in progress...');
        showToast('info', 'Verification Queued', 'UTR submitted. Awaiting gateway webhook confirmation...');
      }
    } catch {
      setStatusText('UTR check notice. Webhook is processing...');
      showToast('info', 'Processing', 'Payment registered. Server is verifying transaction.');
    } finally {
      manualCheckBusyRef.current = false;
      setManualCheckBusy(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    showToast('success', 'Order ID Copied', orderId);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handlePasteUtrFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 12);
        if (cleaned) {
          setUtrInput(cleaned);
          showToast('success', 'Pasted Reference Number', `Pasted: ${cleaned}`);
        }
      }
    } catch {
      showToast('info', 'Clipboard Access', 'Please paste the 12-digit UTR manually in the box below');
    }
  };

  const isUtrValid12Digits = /^\d{12}$/.test(utrInput.trim());
  const fallbackBeneficiaryUpi = routingInfo.beneficiary_name ? `paytm.zap.${routingInfo.beneficiary_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'node'}@upi` : '';
  const fallbackUpiUri = upiButton || (fallbackBeneficiaryUpi ? `upi://pay?pa=${encodeURIComponent(fallbackBeneficiaryUpi)}&pn=${encodeURIComponent(routingInfo.beneficiary_name || 'MoneyOceanP2P')}&am=${amount}&tr=${orderId}&cu=INR&tn=MoneyOcean_${orderId}` : '');
  const gpayUri = fallbackBeneficiaryUpi ? `upi://pay?pa=${encodeURIComponent(fallbackBeneficiaryUpi)}&pn=${encodeURIComponent(routingInfo.beneficiary_name || 'MoneyOcean')}&am=${amount}&tr=${orderId}&cu=INR&tn=MO_${orderId}` : fallbackUpiUri;
  const phonepeUri = fallbackBeneficiaryUpi ? `phonepe://pay?pa=${encodeURIComponent(fallbackBeneficiaryUpi)}&pn=${encodeURIComponent(routingInfo.beneficiary_name || 'MoneyOcean')}&am=${amount}&tr=${orderId}&cu=INR&tn=MO_${orderId}` : fallbackUpiUri;
  const paytmUri = paytmButton || (fallbackBeneficiaryUpi ? `paytmmp://pay?pa=${encodeURIComponent(fallbackBeneficiaryUpi)}&pn=${encodeURIComponent(routingInfo.beneficiary_name || 'MoneyOcean')}&am=${amount}&tr=${orderId}&cu=INR&tn=MO_${orderId}` : fallbackUpiUri);
  const isPassup = Boolean(routingInfo.is_passup ?? (routingInfo.reason?.toLowerCase().includes('passup') || routingInfo.reason?.toLowerCase().includes('pass-up')));

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-center items-center py-8 px-4 sm:px-6 relative selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-[500px] mb-4 flex items-center justify-between">
        <button
          onClick={onNavigateDashboard}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className={`flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full border shadow-sm ${
          isPassup 
            ? 'text-cyan-400 bg-cyan-950/80 border-cyan-500/40' 
            : 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isPassup ? '2-Up Pass-Up Routing' : '100% Direct Settlement'}</span>
        </div>
      </div>

      {loading ? (
        <div className="w-full max-w-[500px] p-10 rounded-3xl bg-[#08101e] backdrop-blur-xl border border-emerald-500/20 shadow-2xl text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
          <h3 className="text-lg font-bold font-display text-white">
            Allocating Payment Slot...
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto font-mono">
            Connecting to secure P2P ledger and generating payment parameters...
          </p>
        </div>
      ) : slotLockedError ? (
        <div className="w-full max-w-[500px] p-8 rounded-3xl bg-[#08101e] backdrop-blur-xl border border-amber-500/40 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold font-display text-white">
              Slot In Progress
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {slotLockedError}
            </p>
          </div>
          <button
            onClick={() => setSlotLockedError(null)}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer font-mono"
          >
            Try Again
          </button>
        </div>
      ) : checkoutStep === 'invoice' ? (
        <div className="w-full max-w-[500px] bg-[#08101e] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <Receipt className="w-4 h-4" />
                <span>Step 1 of 2 — Invoice Review</span>
              </div>
              <h2 className="text-lg font-bold font-display text-white mt-0.5">
                ID Activation Details
              </h2>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold">
                100% P2P Model
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#030712] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1 font-bold text-slate-300 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Invoice / Bill Breakdown</span>
              </span>
              <span className="tabular-nums">Activation Fee</span>
            </div>

            <div className="space-y-2 text-xs pt-1 border-t border-slate-800">
              <div className="flex justify-between items-center py-1">
                <div>
                  <div className="font-semibold text-slate-200">MoneyOcean ID Activation</div>
                  <div className="text-[10px] text-slate-400 font-mono">Lifetime P2P Commission Rights + Dashboard</div>
                </div>
                <div className="font-mono font-bold text-slate-100 tabular-nums">₹{Number(packagePrice || 1).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="flex justify-between items-center py-1 text-slate-400">
                <div className="flex items-center gap-1">
                  <span>Platform / Admin Cut</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">0% Cut</span>
                </div>
                <div className="font-mono font-semibold text-emerald-400 tabular-nums">₹0.00</div>
              </div>
              <div className="flex justify-between items-center pt-2.5 mt-1 border-t border-dashed border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">Total Payable Amount</div>
                  <div className="text-[10px] font-mono text-emerald-400">100% Peer Transfer</div>
                </div>
                <div className="text-2xl font-extrabold font-display text-emerald-400 tabular-nums">
                  ₹{Number(packagePrice || 1).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-[#030712] border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="text-slate-400">
              Billed To: <strong className="text-slate-200">{user?.full_name || 'Buyer'}</strong>
            </div>
            <div className="text-slate-400">
              Mob: <span className="text-slate-200">{user?.mobile || 'N/A'}</span>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              id="payNowProceedButton"
              onClick={async () => {
                const checkoutRes = await initSession();
                if (checkoutRes && checkoutRes.success) {
                  setCheckoutStep('payment');
                  
                  const targetPaymentUrl = checkoutRes.payment_url || paymentUrl;
                  const targetZapKey = checkoutRes.zap_key || dynamicZapKey || platformConfig?.fallback_zap_key || '';
                  const targetOrderId = checkoutRes.order_id || orderId;
                  const targetAmount = Number(checkoutRes.payment?.amount_inr || checkoutRes.amount || packagePrice || 1);

                  // If ZapUPI kit script is loaded in window
                  if (typeof window !== 'undefined' && (window as any).ZapUPI) {
                    try {
                      if (targetPaymentUrl) {
                        (window as any).ZapUPI.loadPayment(targetPaymentUrl);
                        return;
                      } else if (targetZapKey && targetOrderId) {
                        (window as any).ZapUPI.createOrder(
                          {
                            zap_key: targetZapKey.trim(),
                            order_id: targetOrderId.trim(),
                            amount: targetAmount.toFixed(2),
                            customer_mobile: user?.mobile || '',
                            remark: `MoneyOcean|${user?.referral_code || 'P2P'}`
                          },
                          {
                            onResponse: (url: string) => {
                              if ((window as any).ZapUPI) {
                                (window as any).ZapUPI.loadPayment(url);
                              } else {
                                window.location.href = url;
                              }
                            },
                            onError: (errMsg: string) => {
                              console.warn('ZapUPI createOrder notice:', errMsg);
                            }
                          }
                        );
                        return;
                      }
                    } catch (zapErr) {
                      console.warn('ZapUPI launch notice:', zapErr);
                    }
                  } else if (targetPaymentUrl) {
                    window.location.href = targetPaymentUrl;
                  }
                }
              }}
              className="w-full text-center py-4 px-4 rounded-xl font-bold text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Zap className="w-5 h-5 fill-slate-950" />
              <span>Pay via ZapUPI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[500px] bg-[#08101e] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCheckoutStep('invoice')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>View Bill & Details</span>
            </button>
            <div 
              id="timer"
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 tabular-nums ${
                remainingSeconds < 120 
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/40 animate-pulse' 
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#030712] border border-slate-800 text-[10px] font-mono text-center">
            <div className="py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30">
              1. Scan & Pay
            </div>
            <div className="py-1 rounded-lg bg-slate-900 text-slate-300 font-medium">
              2. Paste UTR
            </div>
            <div className="py-1 rounded-lg bg-slate-900 text-slate-400">
              3. Activated
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#030712] border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400">Paying To Beneficiary</div>
              <div className="font-bold text-white truncate">{routingInfo.beneficiary_name || 'Admin Beneficiary'}</div>
            </div>
            <div className="text-right">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                isPassup 
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' 
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isPassup ? '2-Up Pass-Up' : 'Direct Sale'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-300 font-mono">
            <span
              id="statusDot"
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                statusState === 'success'
                  ? 'bg-emerald-400 ring-4 ring-emerald-500/20'
                  : statusState === 'failed'
                  ? 'bg-rose-500 ring-4 ring-rose-500/20'
                  : 'bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse'
              }`}
            />
            <span id="statusText" className="font-medium">
              {statusText}
            </span>
          </div>

          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-extrabold font-display text-emerald-400 tracking-tight tabular-nums">
              ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1 flex items-center justify-center gap-1.5">
              <span>Order ID: <strong className="text-slate-200">{orderId}</strong></span>
              <button
                onClick={handleCopyOrderId}
                className="text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors p-1"
                title="Copy Order ID"
              >
                {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="border border-emerald-500/20 rounded-2xl p-4 bg-[#030712] flex flex-col justify-center items-center min-h-[220px] relative shadow-inner">
            {paymentImageUrl ? (
              <img
                src={paymentImageUrl}
                alt="Payment QR"
                className="max-w-[190px] max-h-[190px] object-contain rounded-lg shadow-md border border-slate-800"
                onError={() => setPaymentImageUrl('')}
              />
            ) : (
              <div className="p-3 bg-white rounded-xl shadow-2xl border-2 border-emerald-400/40 inline-block">
                <QRCodeSVG
                  value={fallbackUpiUri}
                  size={175}
                  level="H"
                  includeMargin={false}
                />
              </div>
            )}
            <div className="text-[11px] font-mono text-slate-400 mt-2.5 text-center">
              Scan with GPay, PhonePe, Paytm, BHIM, Cred or any UPI App
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Quick 1-Tap Mobile UPI Intent</span>
              <span className="text-emerald-400 font-semibold">Zero Fees</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={gpayUri}
                onClick={() => setStatusText('Opening Google Pay...')}
                className="p-2.5 rounded-xl bg-[#030712] hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-center font-mono text-xs font-semibold text-slate-200 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="text-emerald-400 font-black text-sm">GPay</span>
                <span className="text-[10px] text-slate-400">Google Pay</span>
              </a>
              <a
                href={phonepeUri}
                onClick={() => setStatusText('Opening PhonePe...')}
                className="p-2.5 rounded-xl bg-[#030712] hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-center font-mono text-xs font-semibold text-slate-200 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="text-purple-400 font-black text-sm">PhonePe</span>
                <span className="text-[10px] text-slate-400">Instant</span>
              </a>
              <a
                href={paytmUri}
                onClick={() => setStatusText('Opening Paytm...')}
                className="p-2.5 rounded-xl bg-[#030712] hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-center font-mono text-xs font-semibold text-slate-200 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="text-cyan-400 font-black text-sm">Paytm</span>
                <span className="text-[10px] text-slate-400">UPI App</span>
              </a>
            </div>
          </div>

          <div className="grid gap-2.5">
            <button
              type="button"
              id="payButton"
              onClick={handlePayClick}
              className="w-full text-center py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Pay ₹{Number(amount).toLocaleString('en-IN')} via ZapUPI Gateway</span>
            </button>
          </div>

          <div className="flex items-center gap-3 my-2 text-slate-500 text-[11px] font-mono font-semibold uppercase tracking-wider">
            <div className="flex-1 h-px bg-slate-800" />
            <span>SUBMIT 12-DIGIT UTR / REFERENCE</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <form onSubmit={handleVerifyUtr} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="utrInput"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 12-digit UPI UTR"
                  className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-[#030712] border border-slate-800 focus:border-emerald-500 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none transition-all tabular-nums tracking-wider"
                />
                <button
                  type="button"
                  onClick={handlePasteUtrFromClipboard}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-mono transition-colors cursor-pointer"
                >
                  Paste
                </button>
              </div>
              <button
                id="verifyUtr"
                type="submit"
                disabled={manualCheckBusy || !utrInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 font-mono"
              >
                {manualCheckBusy ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{manualCheckBusy ? 'Checking...' : 'Verify'}</span>
              </button>
            </div>
            {isUtrValid12Digits && (
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Valid 12-Digit Reference format ready for instant ledger activation</span>
              </div>
            )}
          </form>

          <div className="text-[11px] text-slate-400 text-center leading-relaxed font-mono pt-1">
            Real-time ledger polling active every 5 seconds.<br />
            100% Peer Transfer — Zero Admin Deduction
          </div>
        </div>
      )}

      {dialog.open && (
        <div 
          id="dialog"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div className="bg-[#08101e] border border-emerald-500/30 w-full max-w-[360px] rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-scaleUp">
            <div 
              id="dialogIcon"
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-lg ${
                dialog.type === 'SUCCESS' 
                  ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 animate-bounce' 
                  : dialog.type === 'FAILED' 
                  ? 'bg-rose-500/20 border-2 border-rose-400 text-rose-400' 
                  : 'bg-amber-500/20 border-2 border-amber-400 text-amber-400'
              }`}
            >
              {dialog.type === 'SUCCESS' ? '✓' : dialog.type === 'FAILED' ? '✕' : '!'}
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
              {dialog.type === 'SUCCESS' ? (
                <button
                  onClick={onNavigateDashboard}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all hover:scale-102 cursor-pointer font-mono"
                >
                  Enter Your Dashboard
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCheckoutStep('invoice');
                    setSlotLockedError(null);
                  }}
                  className="w-full py-3 rounded-xl bg-[#030712] hover:bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer font-mono"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};