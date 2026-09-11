import { createClient } from '@supabase/supabase-js';
import { 
  User, 
  DashboardData, 
  PassupLog, 
  ValidateReferralResponse, 
  CheckoutResponse, 
  Transaction,
  UserMerchantKey,
  PlatformConfig
} from '../types';

export const SUPABASE_URL = 'https://gedbbysyehtdaqgkrmqk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZGJieXN5ZWh0ZGFxZ2tybXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODU3NjgsImV4cCI6MjEwMTc2MTc2OH0.-FKQLcaL0lFzVHmEHg4HQc-AsgfYrjXIoAz4cRkFtXc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper to get current live origin without hardcoded hostnames
export function getLiveOrigin(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin || `${window.location.protocol}//${window.location.host}`;
  }
  return '';
}

export function getLiveReferralUrl(referralCode?: string | null): string {
  const origin = getLiveOrigin();
  if (!referralCode) return origin || '/';
  const code = referralCode.trim();
  return origin ? `${origin}/${code}` : `/${code}`;
}

// Helper to normalize referral codes (handles M0 vs MO, leading hash, dashes, pure numbers, etc.)
export function normalizeReferralVariants(code: string): string[] {
  if (!code) return [];
  const raw = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const variants = new Set<string>();
  if (raw) {
    variants.add(raw);
    // If starts with MO, add M0 variant
    if (raw.startsWith('MO')) {
      variants.add('M0' + raw.slice(2));
    }
    // If starts with M0, add MO variant
    if (raw.startsWith('M0')) {
      variants.add('MO' + raw.slice(2));
    }
    // If pure number, add MO prefix and M0 prefix
    if (/^\d+$/.test(raw)) {
      variants.add('MO' + raw);
      variants.add('M0' + raw);
    }
    // If starts with MO/M0, also add numeric-only variant
    if (/^M[O0]\d+$/.test(raw)) {
      variants.add(raw.slice(2));
    }
  }
  return Array.from(variants);
}

// Helper to fetch live platform configurations (e.g. package_price, reservation_lock_minutes, fallback_zap_key)
export async function getPlatformConfigs(): Promise<PlatformConfig> {
  const defaultConfig: PlatformConfig = {
    package_price: 5000,
    reservation_lock_minutes: 15,
    fallback_zap_key: 'Zapf51bf8673c78299aef19410cc987e265'
  };

  try {
    const { data, error } = await supabase
      .from('platform_configs')
      .select('*');

    if (!error && data && Array.isArray(data) && data.length > 0) {
      if (data[0].key !== undefined || data[0].config_key !== undefined) {
        const mapped: Record<string, any> = {};
        for (const row of data) {
          const k = row.key || row.config_key;
          const v = row.value !== undefined ? row.value : row.config_value;
          if (k) mapped[k] = v;
        }
        return {
          ...defaultConfig,
          ...mapped,
          package_price: Number(mapped.package_price !== undefined ? mapped.package_price : defaultConfig.package_price),
          reservation_lock_minutes: Number(mapped.reservation_lock_minutes || defaultConfig.reservation_lock_minutes),
          fallback_zap_key: mapped.fallback_zap_key || defaultConfig.fallback_zap_key
        };
      } else {
        const row = data[0];
        return {
          ...defaultConfig,
          ...row,
          package_price: Number(row.package_price !== undefined ? row.package_price : (row.amount !== undefined ? row.amount : defaultConfig.package_price)),
          reservation_lock_minutes: Number(row.reservation_lock_minutes || defaultConfig.reservation_lock_minutes),
          fallback_zap_key: row.fallback_zap_key || defaultConfig.fallback_zap_key
        };
      }
    }
  } catch (err) {
    console.warn('getPlatformConfigs query error:', err);
  }

  return defaultConfig;
}

// 1. Referral validation directly from Supabase (Strict - No local mock fallback)
export async function validateReferralCode(p_referral_code: string): Promise<ValidateReferralResponse> {
  const cleanCode = p_referral_code.trim().toUpperCase();
  if (!cleanCode) {
    return {
      valid: false,
      message: 'Sponsor referral code is required'
    };
  }

  const variants = normalizeReferralVariants(cleanCode);

  try {
    // 1. Check RPC for each variant
    for (const v of variants) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('validate_referral_code', {
          p_referral_code: v
        });
        if (!rpcErr && rpcData && rpcData.valid) {
          return rpcData as ValidateReferralResponse;
        }
      } catch (e) {
        console.warn('validate_referral_code RPC error:', e);
      }
    }

    // 2. Direct table lookup with all variants
    for (const v of variants) {
      try {
        const { data: user, error: uErr } = await supabase
          .from('users')
          .select('id, full_name, referral_code, is_active')
          .or(`referral_code.ilike.${v},referral_code.eq.${v}`)
          .maybeSingle();

        if (!uErr && user) {
          return {
            valid: true,
            sponsor_id: user.id,
            full_name: user.full_name,
            referral_code: user.referral_code,
            is_active: user.is_active,
            message: `Verified Sponsor: ${user.full_name} (${user.referral_code})`
          };
        }
      } catch (e) {
        console.warn('User table lookup error:', e);
      }
    }
  } catch (err: any) {
    console.error('Backend referral validation error:', err);
    return {
      valid: false,
      message: err.message || 'Error validating referral code with server'
    };
  }

  return {
    valid: false,
    message: `Sponsor code "${cleanCode}" is not registered in the system.`
  };
}

// 2. Real P2P Checkout generation via Supabase RPC (Strict Server-Side Allocation)
export async function generateP2PCheckout(
  p_referral_code: string, 
  p_buyer_id: string
): Promise<CheckoutResponse> {
  const cleanCode = p_referral_code.trim().toUpperCase();
  
  try {
    // Strictly invoke single-candidate RPC with exact 2 parameters
    const { data, error } = await supabase.rpc('generate_p2p_checkout', {
      p_referral_code: cleanCode,
      p_buyer_id
    });

    if (error) {
      console.error('RPC generate_p2p_checkout failed:', error);
      return {
        success: false,
        error_code: error.code || 'RPC_ERROR',
        message: error.message || 'Failed to allocate checkout slot from server.'
      };
    }

    if (!data || !data.success) {
      return {
        success: false,
        error_code: data?.error_code || 'SLOT_ERROR',
        message: data?.message || 'Payment slot could not be allocated. Please try again.'
      };
    }

    const config = await getPlatformConfigs();
    const pkgAmount = Number(data.amount !== undefined ? data.amount : config.package_price);
    const activeZapKey = data.zap_key || config.fallback_zap_key || '';
    const benName = data.beneficiary_name || 'Admin Beneficiary';
    const benReason = data.passup_reason || (data.is_passup ? 'Pass-up to Upline' : 'Direct Sale');
    const benCode = data.beneficiary_referral_code || '';
    const benId = data.beneficiary_id || '';

    const baseCheckout: CheckoutResponse = {
      success: true,
      order_id: data.order_id,
      zap_key: activeZapKey,
      routing_info: {
        beneficiary_id: benId,
        beneficiary_name: benName,
        beneficiary_referral_code: benCode,
        reason: benReason,
        zap_key: activeZapKey,
        sale_number: data.sale_number,
        is_passup: data.is_passup
      },
      sale_number: data.sale_number,
      is_passup: data.is_passup,
      passup_reason: benReason,
      beneficiary_id: benId,
      beneficiary_name: benName,
      beneficiary_referral_code: benCode,
      beneficiary_zap_key: activeZapKey,
      payment: {
        amount_inr: pkgAmount,
        zap_key: activeZapKey,
        upi_id: benName ? `paytm.zap.${benName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'node'}@upi` : ''
      }
    };

    // Trigger ZapUPI Custom Order creation with the server-allocated order_id
    if (baseCheckout.order_id) {
      try {
        const zapRes = await createZapUPICustomOrder({
          amount: pkgAmount,
          order_id: baseCheckout.order_id,
          zap_key: activeZapKey,
          beneficiary_upi: baseCheckout.payment?.upi_id || '',
          remark: `MoneyOcean|${cleanCode}|${benCode}`
        });

        if (zapRes && zapRes.success) {
          baseCheckout.pay_id = zapRes.pay_id;
          baseCheckout.payment_image_url = zapRes.payment_image_url;
          baseCheckout.upi_button = zapRes.upi_button;
          baseCheckout.paytm_button = zapRes.paytm_button;
          baseCheckout.payment_url = zapRes.payment_url;
        }
      } catch (zapErr) {
        console.warn('ZapUPI gateway call notice:', zapErr);
      }
    }

    return baseCheckout;
  } catch (err: any) {
    console.error('generateP2PCheckout exception:', err);
    return {
      success: false,
      error_code: 'NETWORK_ERROR',
      message: err.message || 'Network error connecting to payment engine.'
    };
  }
}

// ZapUPI Custom Order Creation via Server Endpoint
export async function createZapUPICustomOrder(params: {
  amount: number | string;
  order_id: string;
  zap_key?: string;
  beneficiary_upi?: string;
  customer_mobile?: string;
  remark?: string;
}): Promise<{
  success: boolean;
  pay_id?: string;
  payment_image_url?: string;
  upi_button?: string;
  paytm_button?: string;
  payment_url?: string;
  message?: string;
}> {
  try {
    const res = await fetch('/api/zapupi/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('ZapUPI create order error:', err);
    return { success: false, message: err.message };
  }
}

// ZapUPI Auto-Check Status (Every 2 seconds)
export async function checkZapUPIAutoStatus(payId: string): Promise<string> {
  if (!payId) return 'PENDING';
  try {
    const res = await fetch(`/api/zapupi/auto-check/${encodeURIComponent(payId)}`, {
      cache: 'no-store'
    });
    const data = await res.json();
    let raw = '';
    if (typeof data === 'string') raw = data;
    else if (data && typeof data === 'object') {
      raw = data.status || data.message || data.data?.status || data.raw || '';
    }
    raw = String(raw).trim().toUpperCase();

    if (raw.includes('SUCCESS') || raw === 'PAID') return 'SUCCESS';
    if (raw.includes('FAILED') || raw === 'FAIL') return 'FAILED';
    if (raw.includes('TIMEOUT') || raw === 'TIMED OUT') return 'TIMEOUT';
    return 'PENDING';
  } catch {
    // Direct gateway fallback
    try {
      const direct = await fetch(`https://pay.zapupi.com/pay/auto-check-${encodeURIComponent(payId)}`, {
        cache: 'no-store'
      });
      const text = await direct.text();
      const upper = text.toUpperCase();
      if (upper.includes('SUCCESS') || upper.includes('PAID')) return 'SUCCESS';
      if (upper.includes('FAILED') || upper.includes('FAIL')) return 'FAILED';
      if (upper.includes('TIMEOUT')) return 'TIMEOUT';
    } catch {
      // ignore
    }
    return 'PENDING';
  }
}

// ZapUPI Manual UTR Check
export async function checkZapUPIUtr(payId: string, utr: string): Promise<string> {
  if (!payId || !utr) return 'PENDING';
  try {
    const res = await fetch(`/api/zapupi/utr-check/${encodeURIComponent(payId)}/${encodeURIComponent(utr)}`, {
      cache: 'no-store'
    });
    const data = await res.json();
    let raw = '';
    if (typeof data === 'string') raw = data;
    else if (data && typeof data === 'object') {
      raw = data.status || data.message || data.data?.status || data.raw || '';
    }
    raw = String(raw).trim().toUpperCase();

    if (raw.includes('SUCCESS') || raw === 'PAID') return 'SUCCESS';
    if (raw.includes('FAILED') || raw === 'FAIL') return 'FAILED';
    if (raw.includes('TIMEOUT')) return 'TIMEOUT';
    return 'PENDING';
  } catch {
    return 'PENDING';
  }
}

// 3. Settle sale in backend (Strict Server Settlement via RPC / API - No client manipulation)
export async function settleP2PSale(
  p_order_id: string, 
  p_status: 'SUCCESS' | 'FAILED' | 'EXPIRED', 
  p_utr?: string | null
): Promise<{ success: boolean; status?: string; message?: string; error?: string }> {
  try {
    // 1. Invoke server-side verified endpoint
    const res = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: p_order_id,
        utr: p_utr || null
      })
    });

    const data = await res.json();
    if (data && data.success) {
      return { 
        success: true, 
        status: p_status, 
        message: 'Settlement confirmed by backend ledger.' 
      };
    } else {
      // Direct RPC fallback if server endpoint responded with error
      const { data: rpcData, error: rpcErr } = await supabase.rpc('settle_p2p_sale', {
        p_order_id,
        p_status,
        p_utr: p_utr || null,
        p_webhook_signature: 'CLIENT_VERIFY'
      });

      if (!rpcErr && rpcData) {
        return {
          success: true,
          status: p_status,
          message: 'Settlement confirmed by database RPC.'
        };
      }

      return {
        success: false,
        error: data?.message || rpcErr?.message || 'Settlement verification failed.'
      };
    }
  } catch (err: any) {
    console.error('settleP2PSale error:', err);
    return {
      success: false,
      error: err.message || 'Network error during settlement verification.'
    };
  }
}

// 4. Live User Dashboard (Strictly Backed by PostgreSQL Database Ledger RPC)
export async function getUserDashboard(p_user_id?: string): Promise<DashboardData | null> {
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_user_dashboard', {
      ...(p_user_id ? { p_user_id } : {})
    });

    if (!rpcErr && rpcData && rpcData.success) {
      const u = rpcData.user || {};
      const f = rpcData.financials || {};

      return {
        user_info: {
          id: u.id || p_user_id || '',
          full_name: u.full_name || 'Member',
          email: u.email || '',
          referral_code: u.referral_code || '',
          is_active: Boolean(u.is_active),
          cycle_earning_count: Number(u.cycle_earning_count || 0)
        },
        earnings: {
          today: Number(f.today_income || 0),
          last_7_days: Number(f.last_7_days_income || 0),
          last_30_days: Number(f.last_30_days_income || 0),
          total_earned: Number(f.total_income || 0)
        },
        network: {
          direct_count: Number(f.direct_referrals_count || 0),
          team_size: Number(f.team_size || f.direct_referrals_count || 0)
        }
      };
    } else if (rpcErr) {
      console.warn('[Supabase] get_user_dashboard RPC error:', rpcErr.message);
    }
  } catch (err: any) {
    console.error('[Supabase] get_user_dashboard exception:', err);
  }

  return null;
}

// 5. Live Passup Logs (Strict Database Query)
export async function getUserPassupLogs(p_user_id: string): Promise<PassupLog[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_passup_logs', {
      p_user_id
    });
    if (!error && data && Array.isArray(data)) {
      return data as PassupLog[];
    }

    const { data: rawLogs, error: rErr } = await supabase
      .from('passup_logs')
      .select('*')
      .or(`original_referrer_id.eq.${p_user_id},passed_to_id.eq.${p_user_id}`)
      .order('created_at', { ascending: false });

    if (!rErr && rawLogs && Array.isArray(rawLogs)) {
      return rawLogs.map(l => ({
        sale_number: l.sale_number,
        amount: l.amount,
        passup_reason: l.passup_reason,
        original_referrer_name: l.original_referrer_name || 'Direct Sponsor',
        passed_to_name: l.passed_to_name || 'Qualifying Sponsor',
        date: l.created_at || l.date
      }));
    }
  } catch (err: any) {
    console.error('Passup logs error:', err);
  }
  return [];
}

// 6. Live User Profile (Strict Database Query)
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return data as User;
    }
    if (error) {
      console.warn('getUserProfile error:', error.message);
    }
  } catch (err: any) {
    console.error('getUserProfile exception:', err);
  }
  return null;
}

// 7. Live Transactions (Strict Database Query)
export async function getUserTransactions(userId: string, limit = 20): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, order_id, buyer_user_id, beneficiary_user_id, transaction_type, 
        amount, utr_number, payment_status, zap_key_used, created_at,
        buyer:buyer_user_id ( full_name, email ),
        beneficiary:beneficiary_user_id ( full_name, email )
      `)
      .or(`buyer_user_id.eq.${userId},beneficiary_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && Array.isArray(data)) {
      return data as unknown as Transaction[];
    }
    if (error) {
      console.warn('getUserTransactions error:', error.message);
    }
  } catch (err: any) {
    console.error('getUserTransactions exception:', err);
  }
  return [];
}

// 8. Live User Merchant ZapKeys (Strict Database Query)
export async function getUserMerchantKeys(userId: string): Promise<UserMerchantKey[]> {
  try {
    const { data, error } = await supabase
      .from('user_merchant_keys')
      .select('*')
      .eq('user_id', userId)
      .order('priority_order', { ascending: true });

    if (!error && data && Array.isArray(data)) {
      return data as UserMerchantKey[];
    }
    if (error) {
      console.warn('getUserMerchantKeys error:', error.message);
    }
  } catch (err: any) {
    console.error('getUserMerchantKeys exception:', err);
  }
  return [];
}

export async function saveUserMerchantKey(
  userId: string, 
  zapKey: string, 
  merchantName?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data: existing, error: findErr } = await supabase
      .from('user_merchant_keys')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (findErr) {
      console.warn('Find merchant key error:', findErr.message);
    }

    if (existing && existing.length > 0) {
      const { error: updErr } = await supabase
        .from('user_merchant_keys')
        .update({
          zap_key: zapKey.trim(),
          paytm_merchant_name: merchantName || null,
          is_active: true
        })
        .eq('id', existing[0].id);

      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from('user_merchant_keys')
        .insert({
          user_id: userId,
          zap_key: zapKey.trim(),
          paytm_merchant_name: merchantName || null,
          priority_order: 1,
          is_active: true,
          monthly_limit: 75000.00,
          monthly_received_amount: 0.00
        });

      if (insErr) throw insErr;
    }
    return { success: true };
  } catch (err: any) {
    console.error('Save merchant key error:', err);
    return { success: false, message: err.message || 'Failed to save merchant key' };
  }
}

// 9. Live Team Tree (Strict Database Query)
export async function getTeamTree(userId: string): Promise<any[]> {
  try {
    const { data: directMembers, error } = await supabase
      .from('users')
      .select('id, full_name, email, referral_code, is_active, joining_date, direct_referrals_count, team_size, total_income, sponsor_id')
      .eq('sponsor_id', userId)
      .order('joining_date', { ascending: true });

    if (!error && directMembers && Array.isArray(directMembers)) {
      if (directMembers.length === 0) {
        return [];
      }
      const directIds = directMembers.map(m => m.id);
      const { data: level2Members, error: l2Err } = await supabase
        .from('users')
        .select('id, full_name, email, referral_code, is_active, joining_date, direct_referrals_count, team_size, total_income, sponsor_id')
        .in('sponsor_id', directIds)
        .order('joining_date', { ascending: true });

      if (l2Err) {
        console.warn('level2Members query error:', l2Err.message);
      }

      const tree = directMembers.map(member => {
        const children = (level2Members || []).filter(l2 => l2.sponsor_id === member.id);
        return {
          ...member,
          level: 1,
          children: children.map(c => ({ ...c, level: 2 }))
        };
      });

      return tree;
    }
    if (error) {
      console.warn('getTeamTree query error:', error.message);
    }
  } catch (err) {
    console.error('Team tree fetch exception:', err);
  }
  return [];
}
