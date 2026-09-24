import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCw, 
  Search, 
  PlusCircle, 
  ArrowLeft, 
  Receipt, 
  User as UserIcon, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle,
  Zap,
  ExternalLink
} from 'lucide-react';
import { showToast } from './Toast';

interface ZapUPIHtmlKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultZapKey?: string;
  defaultOrderId?: string;
  defaultAmount?: number;
  customerMobile?: string;
  remark?: string;
  onPaymentSuccess?: (orderId: string) => void;
}

export const ZapUPIHtmlKitModal: React.FC<ZapUPIHtmlKitModalProps> = ({
  isOpen,
  onClose,
  defaultZapKey = '',
  defaultOrderId = '',
  defaultAmount,
  customerMobile = '',
  remark = 'UltraPay P2P Slot',
  onPaymentSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'status'>('create');
  
  // Create Order Fields
  const [zapKey, setZapKey] = useState<string>(defaultZapKey);
  const [orderId, setOrderId] = useState<string>(defaultOrderId || `ORD${Date.now()}`);
  const [amount, setAmount] = useState<string>(defaultAmount ? String(defaultAmount) : '');
  const [mobile, setMobile] = useState<string>(customerMobile);
  const [rem, setRem] = useState<string>(remark);
  const [createBusy, setCreateBusy] = useState<boolean>(false);

  // Status Check Fields
  const [statusKey, setStatusKey] = useState<string>(defaultZapKey);
  const [statusOid, setStatusOid] = useState<string>(defaultOrderId || '');
  const [statusBusy, setStatusBusy] = useState<boolean>(false);

  // Details View
  const [detailsData, setDetailsData] = useState<any>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      if (defaultZapKey) {
        setZapKey(defaultZapKey);
        setStatusKey(defaultZapKey);
      }
      if (defaultOrderId) {
        setOrderId(defaultOrderId);
        setStatusOid(defaultOrderId);
      }
      if (defaultAmount) {
        setAmount(String(defaultAmount));
      }
      if (customerMobile) {
        setMobile(customerMobile);
      }
      if (remark) {
        setRem(remark);
      }
    }
  }, [isOpen, defaultZapKey, defaultOrderId, defaultAmount, customerMobile, remark]);

  // Set ZapUPI Callbacks only when modal is open or active
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ZapUPI && isOpen) {
      window.ZapUPI.setPaymentCallbacks({
        onSuccess: (id: string) => {
          if (window.Swal) {
            window.Swal.close();
          }
          if (onPaymentSuccess) {
            onPaymentSuccess(id);
          }
        },
        onFailed: (id: string) => {
          if (window.Swal) {
            window.Swal.close();
          }
          showToast('error', 'Payment Failed', `Order: ${id}`);
        },
        onTimeout: (id: string) => {
          if (window.Swal) {
            window.Swal.close();
          }
          showToast('error', 'Payment Timed Out', `Order: ${id}`);
        }
      });
    }
  }, [isOpen, zapKey, onPaymentSuccess]);

  const regenOrderId = () => {
    setOrderId(`ORD${Date.now()}`);
  };

  // 1. Create Order & Launch
  const handleCreateOrder = async () => {
    if (!zapKey.trim()) {
      showSweetError('Zap Key is required');
      return;
    }
    if (!orderId.trim()) {
      showSweetError('Order ID is required');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showSweetError('Please enter a valid amount');
      return;
    }

    setCreateBusy(true);

    // Pre-record transaction in Supabase so webhook immediately finds and settles it
    try {
      await fetch('/api/record-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId.trim(),
          amount: Number(amount),
          zap_key_used: zapKey.trim(),
          payment_status: 'PENDING'
        })
      });
    } catch (recErr) {
      console.warn('Pre-record transaction notice:', recErr);
    }

    if (window.Swal) {
      window.Swal.fire({
        title: 'Creating Order...',
        text: 'Connecting to ZapUPI Gateway',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          window.Swal.showLoading();
        }
      });
    }

    if (window.ZapUPI) {
      window.ZapUPI.createOrder(
        {
          zap_key: zapKey.trim(),
          order_id: orderId.trim(),
          amount: Number(amount).toFixed(2),
          customer_mobile: mobile.trim(),
          remark: rem.trim()
        },
        {
          onResponse: (paymentUrl: string, rid: string) => {
            setCreateBusy(false);
            if (window.Swal) window.Swal.close();
            if (window.ZapUPI) {
              window.ZapUPI.loadPayment(paymentUrl);
            } else {
              window.open(paymentUrl, '_blank');
            }
            regenOrderId();
          },
          onError: (errMsg: string) => {
            setCreateBusy(false);
            showSweetError(errMsg || 'Failed to create order');
          }
        }
      );
    } else {
      // Fallback via our API server endpoint
      fetch('/api/zapupi/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zap_key: zapKey.trim(),
          order_id: orderId.trim(),
          amount: Number(amount).toFixed(2),
          customer_mobile: mobile.trim(),
          remark: rem.trim()
        })
      })
        .then(res => res.json())
        .then(data => {
          setCreateBusy(false);
          if (window.Swal) window.Swal.close();
          if (data.payment_url) {
            window.location.href = data.payment_url;
          } else {
            showSweetError(data.message || 'Payment initiation failed');
          }
        })
        .catch(err => {
          setCreateBusy(false);
          showSweetError(err.message || 'Network error');
        });
    }
  };

  // 2. Fetch Order Status via ZapUPI SDK
  const fetchStatus = (oid: string, keyToUse: string) => {
    const cleanKey = keyToUse.trim();
    const cleanOid = oid.trim();
    if (!cleanKey) {
      showSweetError('Zap Key is required');
      return;
    }
    if (!cleanOid) {
      showSweetError('Order ID is required');
      return;
    }

    setStatusBusy(true);

    if (window.Swal) {
      window.Swal.fire({
        title: 'Fetching Details...',
        text: cleanOid,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          window.Swal.showLoading();
        }
      });
    }

    if (window.ZapUPI) {
      window.ZapUPI.orderStatus(
        { zap_key: cleanKey, order_id: cleanOid },
        {
          onResponse: (_id: string, data: any) => {
            setStatusBusy(false);
            if (window.Swal) window.Swal.close();
            setDetailsData(data);
            setShowDetails(true);
          },
          onError: (errMsg: string) => {
            setStatusBusy(false);
            showSweetError(errMsg || 'Failed to fetch status');
          }
        }
      );
    } else {
      setStatusBusy(false);
      showSweetError('ZapUPI SDK not loaded');
    }
  };

  const showSweetError = (msg: string) => {
    if (window.Swal) {
      window.Swal.fire({
        icon: 'error',
        title: 'Notice',
        text: msg,
        confirmButtonColor: '#3b6ef8'
      });
    } else {
      showToast('error', 'ZapUPI Error', msg);
    }
  };

  if (!isOpen) return null;

  const d = detailsData?.data || detailsData || {};
  const statusStr = String(d.status || '').toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#f4f6fb] text-[#1a1a2e] w-full max-w-[540px] rounded-2xl shadow-2xl overflow-hidden border border-slate-300 relative flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b6ef8] text-white flex items-center justify-center text-lg font-bold shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="font-extrabold text-base text-[#1a1a2e] flex items-center gap-1.5">
                <span>Zap</span><span className="text-[#3b6ef8]">UPI</span>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-[#3b6ef8] px-2 py-0.5 rounded-full border border-blue-200">HTML KIT</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Single HTML Web Kit • Direct Gateway Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Details View (if active) */}
          {showDetails ? (
            <div className="space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:text-[#3b6ef8] hover:border-[#3b6ef8] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Console</span>
                </button>
                <div className="text-xs font-mono font-bold text-slate-500">
                  {d.order_id || statusOid}
                </div>
              </div>

              {/* Status Hero */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
                <div className="text-3xl mb-2 flex justify-center">
                  {statusStr === 'success' ? (
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  ) : statusStr === 'failed' ? (
                    <XCircle className="w-10 h-10 text-rose-600" />
                  ) : statusStr === 'pending' ? (
                    <Clock className="w-10 h-10 text-amber-500" />
                  ) : (
                    <HelpCircle className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <div className={`text-lg font-black uppercase ${
                  statusStr === 'success' ? 'text-emerald-600' :
                  statusStr === 'failed' ? 'text-rose-600' :
                  statusStr === 'pending' ? 'text-amber-600' : 'text-slate-700'
                }`}>
                  {d.status || 'Status Check'}
                </div>
                <div className="text-2xl font-black font-mono text-[#1a1a2e] mt-1">
                  ₹{d.amount ? Number(d.amount).toFixed(2) : Number(amount).toFixed(2)}
                </div>
              </div>

              {/* Transaction Card */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-500" />
                  <span>Transaction Details</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between p-3">
                    <span className="text-slate-500 font-medium">Order ID</span>
                    <span className="font-mono font-bold text-blue-600">{d.order_id || '—'}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-500 font-medium">TXN ID</span>
                    <span className="font-mono font-bold text-blue-600">{d.txn_id || '—'}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-500 font-medium">UTR Ref</span>
                    <span className="font-mono font-bold text-slate-900">{d.utr || '—'}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-500 font-medium">Status</span>
                    <span className="font-bold uppercase text-emerald-600">{d.status || '—'}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-500 font-medium">Created At</span>
                    <span className="font-mono text-slate-700">{d.create_at || new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Customer Card */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Customer & Split Remark</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between p-3">
                    <span className="text-slate-500 font-medium">Customer Mobile</span>
                    <span className="font-mono text-slate-900">{d.custumer_mobile || d.customer_mobile || mobile}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-500 font-medium">Remark</span>
                    <span className="font-medium text-slate-800">{d.remark || rem}</span>
                  </div>
                  {Array.isArray(d.remark_array) && d.remark_array.length > 0 && (
                    <div className="flex justify-between p-3 items-center">
                      <span className="text-slate-500 font-medium">Split IDs</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {d.remark_array.map((tag: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[10px] font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Navigation Tabs */}
              <div className="flex gap-1 bg-slate-200 p-1 rounded-xl mb-5">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'create'
                      ? 'bg-white text-[#1a1a2e] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#3b6ef8]" />
                  <span>Create Order</span>
                </button>
                <button
                  onClick={() => setActiveTab('status')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'status'
                      ? 'bg-white text-[#1a1a2e] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Order Status</span>
                </button>
              </div>

              {/* Tab 1: Create Order */}
              {activeTab === 'create' && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                      Zap Key (Beneficiary Merchant Key)
                    </label>
                    <input
                      type="text"
                      value={zapKey}
                      onChange={(e) => setZapKey(e.target.value)}
                      placeholder="zap••••••••••••••"
                      className="w-full bg-[#f4f6fb] border border-slate-300 focus:border-[#3b6ef8] rounded-lg px-3.5 py-2 text-xs font-mono text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        Order ID
                      </label>
                      <span className="text-[10px] text-slate-400 font-sans">auto-generated</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        placeholder="ORD..."
                        className="flex-1 bg-[#f4f6fb] border border-slate-300 focus:border-[#3b6ef8] rounded-lg px-3.5 py-2 text-xs font-mono text-slate-800 outline-none transition-all"
                      />
                      <button
                        onClick={regenOrderId}
                        title="Regenerate Order ID"
                        className="px-3 rounded-lg border border-slate-300 bg-[#f4f6fb] hover:bg-blue-50 hover:border-[#3b6ef8] text-[#3b6ef8] transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-600 text-xs">₹</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          min="1"
                          step="any"
                          className="w-full bg-[#f4f6fb] border border-slate-300 focus:border-[#3b6ef8] rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-slate-800 outline-none transition-all font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          Mobile
                        </label>
                        <span className="text-[10px] text-slate-400">optional</span>
                      </div>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit mobile"
                        maxLength={10}
                        className="w-full bg-[#f4f6fb] border border-slate-300 focus:border-[#3b6ef8] rounded-lg px-3.5 py-2 text-xs font-mono text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        Remark
                      </label>
                      <span className="text-[10px] text-slate-400">optional</span>
                    </div>
                    <input
                      type="text"
                      value={rem}
                      onChange={(e) => setRem(e.target.value)}
                      placeholder="R1 | R2 | R3"
                      className="w-full bg-[#f4f6fb] border border-slate-300 focus:border-[#3b6ef8] rounded-lg px-3.5 py-2 text-xs font-sans text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <button
                    onClick={handleCreateOrder}
                    disabled={createBusy}
                    className="w-full py-3.5 rounded-xl bg-[#3b6ef8] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>{createBusy ? 'Connecting to ZapUPI...' : 'Create Order & Pay via ZapUPI'}</span>
                  </button>
                </div>
              )}

              {/* Tab 2: Check Status */}
              {activeTab === 'status' && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                      Zap Key
                    </label>
                    <input
                      type="text"
                      value={statusKey}
                      onChange={(e) => setStatusKey(e.target.value)}
                      placeholder="zap••••••••••••••"
                      className="w-full bg-[#f4f6fb] border border-slate-300 focus:border-[#3b6ef8] rounded-lg px-3.5 py-2 text-xs font-mono text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                      Order ID
                    </label>
                    <input
                      type="text"
                      value={statusOid}
                      onChange={(e) => setStatusOid(e.target.value)}
                      placeholder="ORD..."
                      className="w-full bg-[#f4f6fb] border border-slate-300 focus:border-[#3b6ef8] rounded-lg px-3.5 py-2 text-xs font-mono text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <button
                    onClick={() => fetchStatus(statusOid, statusKey)}
                    disabled={statusBusy}
                    className="w-full py-3.5 rounded-xl bg-[#16a34a] hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>{statusBusy ? 'Checking Status...' : 'Check Status in ZapUPI Gateway'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ZapUPI Official JS Kit</span>
          </div>
          <span>UltraPay P2P Engine</span>
        </div>
      </div>
    </div>
  );
};
