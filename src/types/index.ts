export interface SlotPackage {
  slot_number: number;
  slot_name: string;
  price: number;
  phase: number;
  is_unlocked: boolean;
  unlock_milestone_ids: number;
  created_at?: string;
  description?: string;
  badge?: string;
}

export interface UserSlot {
  id: string;
  user_id: string;
  slot_number: number;
  is_active: boolean;
  qualifying_sponsor_id?: string | null;
  activated_at?: string;
}

export interface PlatformConfig {
  package_price?: number;
  reservation_lock_minutes?: number;
  fallback_zap_key?: string;
  referral_cutoff_date?: string;
  platform_launch_date?: string;
  marketing_plan_pdf_url?: string;
  webhook_url?: string;
  slot_packages?: SlotPackage[];
  [key: string]: any;
}

export interface User {
  id: string;
  referral_code: string;
  full_name: string;
  email: string;
  mobile?: string;
  sponsor_id: string | null;
  qualifying_sponsor_id: string | null;
  is_active: boolean;
  direct_referrals_count: number;
  team_size: number;
  today_income: number;
  last_7_days_income: number;
  last_30_days_income: number;
  total_income: number;
  joining_date?: string;
  last_income_reset_date?: string;
  cycle_earning_count: number;
  role?: string;
  is_admin?: boolean;
}

export interface UserMerchantKey {
  id: string;
  user_id: string;
  zap_key: string;
  zap_key_hash?: string;
  paytm_merchant_name?: string | null;
  priority_order: number;
  is_active: boolean;
  monthly_received_amount: number;
  monthly_limit: number;
  last_reset_month?: string;
  created_at: string;
}

export type TxFsmState = 
  | 'INITIATED'
  | 'PAYMENT_GATEWAY_LOCKED'
  | 'UTR_SUBMITTED'
  | 'WEBHOOK_VERIFIED'
  | 'SETTLED'
  | 'FAILED'
  | 'EXPIRED';

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  id: string;
  transaction_order_id: string;
  user_id: string;
  account_type: 'BUYER_PENDING' | 'BENEFICIARY_P2P_WALLET' | string;
  entry_type: LedgerEntryType;
  amount: number;
  balance_after?: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  order_id: string;
  idempotency_key?: string | null;
  buyer_user_id: string;
  beneficiary_user_id: string;
  transaction_type: string;
  is_passup?: boolean | null;
  amount: number;
  utr_number?: string | null;
  payment_status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  fsm_state?: TxFsmState;
  zap_key_used: string;
  zap_key_hash?: string;
  webhook_signature?: string | null;
  slot_number?: number;
  generation_level?: number;
  created_at: string;
  updated_at?: string;
  buyer?: {
    full_name: string;
    email: string;
    referral_code?: string;
  };
  beneficiary?: {
    full_name: string;
    email: string;
    referral_code?: string;
  };
}

export interface PassupLog {
  sale_number: number;
  amount: number;
  passup_reason: string;
  slot_number?: number;
  generation_level?: number;
  buyer_name?: string | null;
  buyer_referral_code?: string | null;
  original_referrer_name: string | null;
  original_referrer_code?: string | null;
  passed_to_name: string | null;
  passed_to_code?: string | null;
  date: string;
}

export interface DashboardData {
  user_info: {
    id: string;
    full_name: string;
    email: string;
    referral_code: string;
    is_active: boolean;
    cycle_earning_count: number;
  };
  earnings: {
    today: number;
    last_7_days: number;
    last_30_days: number;
    total_earned: number;
  };
  network: {
    direct_count: number;
    team_size: number;
  };
}

export interface ValidateReferralResponse {
  valid: boolean;
  sponsor_id?: string;
  full_name?: string;
  referral_code?: string;
  is_active?: boolean;
  message?: string;
}

export interface CheckoutResponse {
  success: boolean;
  message?: string;
  error_code?: 'SLOT_IN_PROGRESS' | string;
  order_id?: string;
  pay_id?: string;
  zap_key?: string;
  amount?: number;
  routing_info?: {
    beneficiary_id?: string;
    beneficiary_name?: string;
    beneficiary_referral_code?: string;
    reason?: string;
    zap_key?: string;
    sale_number?: number;
    is_passup?: boolean;
  };
  payment_image_url?: string;
  upi_button?: string;
  paytm_button?: string;
  payment_url?: string;
  sale_number?: number;
  slot_number?: number;
  slot_name?: string;
  is_passup?: boolean;
  passup_reason?: string;
  beneficiary_id?: string;
  beneficiary_name?: string;
  beneficiary_referral_code?: string;
  beneficiary_zap_key?: string;
  merchant_name?: string;
  zap_key_masked?: string;
  generation_level?: number;
  payment?: {
    amount_inr: number;
    zap_key: string;
    upi_id?: string;
  };
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  referral_code: string;
  is_active: boolean;
  joining_date: string;
  direct_referrals_count: number;
  team_size: number;
  total_income: number;
  level: number;
  sponsor_id: string | null;
  sponsor_name?: string;
}

declare global {
  interface Window {
    ZapUPI?: {
      setPaymentCallbacks: (callbacks: {
        onSuccess?: (orderId: string) => void;
        onFailed?: (orderId: string) => void;
        onTimeout?: (orderId: string) => void;
      }) => void;
      createOrder: (
        payload: {
          zap_key: string;
          order_id: string;
          amount: number | string;
          customer_mobile?: string;
          remark?: string;
        },
        callbacks: {
          onResponse: (paymentUrl: string, responseId: string) => void;
          onError: (errorMessage: string) => void;
        }
      ) => void;
      loadPayment: (paymentUrl: string) => void;
      orderStatus: (
        payload: {
          zap_key: string;
          order_id: string;
        },
        callbacks: {
          onResponse: (orderId: string, data: any) => void;
          onError: (errorMessage: string) => void;
        }
      ) => void;
    };
    Swal?: any;
  }
}

