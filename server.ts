import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[Server Warning] SUPABASE_URL or SUPABASE_KEY is missing from environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to cleanly extract any JSONB value from platform_configs
async function getDynamicConfig(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('platform_configs')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data || data.value === undefined || data.value === null) {
      return null;
    }

    let val = data.value;
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        // raw string
      }
    }
    return String(val).trim();
  } catch (err) {
    console.error(`[Config Fetch Error] Key ${key}:`, err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  const ZAP_API_URL = 'https://pay.zapupi.com/api/create-order';

  // 1. Create ZapUPI Order (Dynamic Price & Key Allocation)
  app.post('/api/zapupi/create-order', async (req: Request, res: Response) => {
    try {
      let { 
        amount, 
        order_id, 
        zap_key, 
        customer_mobile, 
        remark = 'MoneyOcean P2P Slot',
        beneficiary_upi 
      } = req.body;

      // 1. Strict Dynamic Amount from Database if not provided
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        const configPriceStr = await getDynamicConfig('package_price');
        if (!configPriceStr || isNaN(Number(configPriceStr)) || Number(configPriceStr) <= 0) {
          return res.status(500).json({
            status: 'error',
            success: false,
            message: 'Database platform_configs missing or invalid "package_price"'
          });
        }
        amount = Number(configPriceStr);
      }

      // 2. Dynamic ZapKey fallback from platform_configs
      let activeZapKey = (zap_key && String(zap_key).trim().length > 5) ? String(zap_key).trim() : '';
      if (!activeZapKey) {
        const fallbackKey = await getDynamicConfig('fallback_zap_key');
        if (fallbackKey && fallbackKey.length > 5) {
          activeZapKey = fallbackKey;
        } else {
          activeZapKey = process.env.ZAP_KEY || '';
        }
      }

      if (!activeZapKey) {
        return res.status(500).json({
          status: 'error',
          success: false,
          message: 'No valid ZapKey provided and fallback_zap_key missing in database'
        });
      }

      const formattedAmount = Number(amount).toFixed(2);
      const uniqueOrderId = order_id || `MO${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
      const upiId = beneficiary_upi || '';
      const standardUpiIntent = upiId 
        ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('MoneyOcean P2P')}&am=${formattedAmount}&tr=${encodeURIComponent(uniqueOrderId)}&cu=INR&tn=${encodeURIComponent(`Slot_${uniqueOrderId}`)}`
        : '';
      const standardPaytmIntent = upiId
        ? `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('MoneyOcean P2P')}&am=${formattedAmount}&tr=${encodeURIComponent(uniqueOrderId)}&cu=INR`
        : '';

      const payload = {
        zap_key: activeZapKey,
        order_id: uniqueOrderId,
        amount: formattedAmount,
        customer_mobile: customer_mobile || '',
        remark,
        webhook_url: 'https://moneyocean-webhook-shield.moneyocean.workers.dev'
      };

      try {
        const zapResponse = await fetch(ZAP_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data: any = await zapResponse.json();

        if (data && (data.status === 'success' || data.status === 'SUCCESS' || data.pay_id)) {
          return res.json({
            status: 'success',
            success: true,
            order_id: uniqueOrderId,
            amount: formattedAmount,
            pay_id: data.pay_id || '',
            payment_image_url: data.payment_image_url || '',
            upi_button: data.upi_button || standardUpiIntent,
            paytm_button: data.paytm_button || standardPaytmIntent,
            payment_url: data.payment_url || ''
          });
        } else {
          return res.json({
            status: 'success',
            success: true,
            order_id: uniqueOrderId,
            amount: formattedAmount,
            pay_id: '',
            payment_image_url: '',
            upi_button: standardUpiIntent,
            paytm_button: standardPaytmIntent,
            payment_url: '',
            gateway_note: data?.message || 'Custom UPI Active'
          });
        }
      } catch (gatewayErr: any) {
        console.warn('[ZapUPI Gateway] Fetch note:', gatewayErr?.message);
        return res.json({
          status: 'success',
          success: true,
          order_id: uniqueOrderId,
          amount: formattedAmount,
          pay_id: '',
          payment_image_url: '',
          upi_button: standardUpiIntent,
          paytm_button: standardPaytmIntent,
          payment_url: ''
        });
      }
    } catch (err: any) {
      console.error('[ZapUPI Gateway] Error creating order:', err);
      return res.status(500).json({
        status: 'error',
        success: false,
        message: err.message || 'Failed to communicate with ZapUPI gateway'
      });
    }
  });

  // 2. Safe Record-Transaction: Check if existing before processing
  app.post('/api/record-transaction', async (req: Request, res: Response) => {
    try {
      const { order_id } = req.body;
      if (!order_id) {
        return res.status(400).json({ error: 'order_id is required' });
      }

      const { data: existing } = await supabase
        .from('transactions')
        .select('id, payment_status, order_id')
        .eq('order_id', order_id)
        .maybeSingle();

      if (existing) {
        return res.json({ success: true, message: 'Transaction record found', data: existing });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.json({ success: false, error: err.message });
    }
  });

  // 3. Status Proxies
  app.get('/api/zapupi/auto-check/:payId', async (req: Request, res: Response) => {
    try {
      const { payId } = req.params;
      if (!payId) {
        return res.status(400).json({ status: 'error', message: 'pay_id is required' });
      }
      const checkUrl = `https://pay.zapupi.com/pay/auto-check-${encodeURIComponent(payId)}`;
      const response = await fetch(checkUrl, { headers: { 'Cache-Control': 'no-cache' } });
      const text = await response.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      return res.json(parsed);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.get('/api/zapupi/utr-check/:payId/:utr', async (req: Request, res: Response) => {
    try {
      const { payId, utr } = req.params;
      if (!payId || !utr) {
        return res.status(400).json({ status: 'error', message: 'pay_id and utr are required' });
      }
      const utrUrl = `https://pay.zapupi.com/pay/utr-check-${encodeURIComponent(payId)}-${encodeURIComponent(utr)}`;
      const response = await fetch(utrUrl, { headers: { 'Cache-Control': 'no-cache' } });
      const text = await response.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      return res.json(parsed);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 4. Secure ZapUPI Webhook Endpoint (Relay-Safe Acknowledgment)
  app.post('/api/zapupi-webhook', async (req: Request, res: Response) => {
    try {
      const payload = req.body || {};
      const order_id = payload.order_id || payload.orderId || payload.order_no || payload.tr;
      if (!order_id) {
        return res.status(400).json({ received: false, error: 'Missing order_id' });
      }
      // Direct settlement yahan se bypass ki gayi hai taaki Edge Function handles everything securely
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Acknowledged. Edge webhook processor active.', 
        order_id: String(order_id) 
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 5. Verification Endpoint (Read-Only State Check)
  app.post('/api/verify-payment', async (req: Request, res: Response) => {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    const { data: tx } = await supabase
      .from('transactions')
      .select('payment_status, utr_number, amount')
      .eq('order_id', String(order_id))
      .maybeSingle();

    if (tx && tx.payment_status === 'SUCCESS') {
      return res.json({ success: true, message: 'Order is settled', data: tx });
    }
    return res.json({ success: false, message: 'Payment verification in progress' });
  });

  // 6. Direct Service-Role Pass-Up Audit Logs Endpoint
  // Resolves actual buyer name, referral codes, original referrer, and passed-to upline
  app.get('/api/passup-logs/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId is required', logs: [] });
      }

      const result: any[] = [];
      const seenKeys = new Set<string>();

      // 1. Query passup_logs table with relational joins
      let passupQuery = supabase
        .from('passup_logs')
        .select(`
          id,
          sale_number,
          amount,
          passup_reason,
          created_at,
          original_referrer_id,
          passed_to_upline_id,
          buyer_user_id,
          buyer:buyer_user_id ( full_name, email, referral_code ),
          original_referrer:original_referrer_id ( full_name, email, referral_code ),
          passed_to:passed_to_upline_id ( full_name, email, referral_code )
        `);

      if (userId !== 'all') {
        passupQuery = passupQuery.or(`original_referrer_id.eq.${userId},passed_to_upline_id.eq.${userId}`);
      }

      const { data: rawLogs, error: rErr } = await passupQuery.order('created_at', { ascending: false });

      if (!rErr && rawLogs && rawLogs.length > 0) {
        // Collect missing user IDs if relational foreign key join was not resolved
        const missingIds = new Set<string>();
        rawLogs.forEach((l: any) => {
          if (!l.buyer?.full_name && l.buyer_user_id) missingIds.add(l.buyer_user_id);
          if (!l.original_referrer?.full_name && l.original_referrer_id) missingIds.add(l.original_referrer_id);
          if (!l.passed_to?.full_name && l.passed_to_upline_id) missingIds.add(l.passed_to_upline_id);
        });

        const fallbackUsers = new Map<string, { full_name: string; referral_code: string }>();
        if (missingIds.size > 0) {
          try {
            const { data: uList } = await supabase
              .from('users')
              .select('id, full_name, referral_code')
              .in('id', Array.from(missingIds));
            (uList || []).forEach((u: any) => fallbackUsers.set(u.id, { full_name: u.full_name, referral_code: u.referral_code }));
          } catch (e) {
            console.warn('[Passup Logs API] Fallback users lookup note:', e);
          }
        }

        for (const l of rawLogs as any[]) {
          const buyer = l.buyer || fallbackUsers.get(l.buyer_user_id);
          const orig = l.original_referrer || fallbackUsers.get(l.original_referrer_id);
          const upline = l.passed_to || fallbackUsers.get(l.passed_to_upline_id);

          const dedupKey = `${l.buyer_user_id || l.id}_${l.sale_number}`;
          seenKeys.add(dedupKey);

          result.push({
            sale_number: Number(l.sale_number || 1),
            amount: Number(l.amount || 0),
            passup_reason: l.passup_reason || '1ST_3RD_RULE',
            buyer_name: buyer?.full_name || 'Member Sale',
            buyer_referral_code: buyer?.referral_code || null,
            original_referrer_name: orig?.full_name || 'Direct Sponsor',
            original_referrer_code: orig?.referral_code || null,
            passed_to_name: upline?.full_name || 'Qualifying Sponsor',
            passed_to_code: upline?.referral_code || null,
            date: l.created_at || new Date().toISOString()
          });
        }
      }

      // 2. Query transactions table for any settled pass-up sales not in passup_logs
      try {
        let txQuery = supabase
          .from('transactions')
          .select(`
            id,
            order_id,
            buyer_user_id,
            beneficiary_user_id,
            sponsor_id,
            sale_number,
            is_passup,
            transaction_type,
            amount,
            payment_status,
            created_at,
            buyer:buyer_user_id ( full_name, email, referral_code ),
            beneficiary:beneficiary_user_id ( full_name, email, referral_code ),
            sponsor:sponsor_id ( full_name, email, referral_code )
          `)
          .eq('payment_status', 'SUCCESS');

        if (userId !== 'all') {
          txQuery = txQuery.or(`beneficiary_user_id.eq.${userId},sponsor_id.eq.${userId}`);
        }

        const { data: txList } = await txQuery.order('created_at', { ascending: false });

        if (txList && txList.length > 0) {
          for (const t of txList as any[]) {
            const txType = String(t.transaction_type || '').toUpperCase();
            const orderId = String(t.order_id || '').toUpperCase();
            const utr = String(t.utr_number || '').toUpperCase();
            const zapKey = String(t.zap_key_used || '').toUpperCase();
            if (
              txType.includes('VIP') || 
              txType.includes('FREE_PASS') || 
              orderId.includes('VIP_SEED') || 
              utr.startsWith('SEED_') || 
              zapKey.includes('ADMIN_')
            ) {
              continue;
            }

            const isPassup = Boolean(t.is_passup || (t.transaction_type && t.transaction_type !== 'DIRECT_REFERRAL_100PCT'));
            if (!isPassup) continue;

            const saleNum = t.sale_number || (t.transaction_type?.includes('1') ? 1 : t.transaction_type?.includes('3') ? 3 : 1);
            const dedupKey = `${t.buyer_user_id}_${saleNum}`;
            if (seenKeys.has(dedupKey)) continue;
            seenKeys.add(dedupKey);

            result.push({
              sale_number: saleNum,
              amount: Number(t.amount || 0),
              passup_reason: t.transaction_type || 'PASSUP_QUALIFICATION',
              buyer_name: t.buyer?.full_name || 'Member Sale',
              buyer_referral_code: t.buyer?.referral_code || null,
              original_referrer_name: t.sponsor?.full_name || 'Direct Sponsor',
              original_referrer_code: t.sponsor?.referral_code || null,
              passed_to_name: t.beneficiary?.full_name || 'Qualifying Sponsor',
              passed_to_code: t.beneficiary?.referral_code || null,
              date: t.created_at
            });
          }
        }
      } catch (txErr) {
        console.warn('[Passup Logs API] Transactions passup note:', txErr);
      }

      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return res.json({ success: true, logs: result });
    } catch (err: any) {
      console.error('[Passup Logs API] Server error:', err);
      return res.status(500).json({ success: false, error: err.message, logs: [] });
    }
  });

  // Vite middleware in dev or Static in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MoneyOcean Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
