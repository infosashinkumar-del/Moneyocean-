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

  // Admin Manual Settlement Endpoint
  app.post('/api/admin/simulate-settle', async (req: Request, res: Response) => {
    try {
      const { order_id, utr } = req.body;
      if (!order_id) {
        return res.status(400).json({ success: false, message: 'order_id is required' });
      }

      const finalUtr = utr ? String(utr).trim() : `ADMIN_${Date.now()}`;
      const { data, error } = await supabase.rpc('settle_p2p_sale', {
        p_order_id: String(order_id).trim(),
        p_status: 'SUCCESS',
        p_utr: finalUtr,
        p_webhook_signature: 'ADMIN_MANUAL_SETTLE'
      });

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.json({
        success: Boolean(data?.success),
        message: data?.message || 'Order settled successfully by Admin',
        data
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Live Team Tree Drill-Down with Full Service-Role Attribution
  app.get('/api/team-tree/:nodeId', async (req: Request, res: Response) => {
    try {
      const nodeId = String(req.params.nodeId || '').trim();
      if (!nodeId) {
        return res.status(400).json({ success: false, message: 'nodeId is required', tree: [] });
      }

      // 1. Fetch Level 1 directs
      const { data: directs, error: directErr } = await supabase
        .from('users')
        .select('id, full_name, email, referral_code, is_active, joining_date, direct_referrals_count, team_size, total_income, sponsor_id')
        .eq('sponsor_id', nodeId)
        .order('joining_date', { ascending: true });

      if (directErr) {
        console.warn('[Team Tree API] directs error:', directErr.message);
        return res.status(500).json({ success: false, message: directErr.message, tree: [] });
      }

      if (!directs || directs.length === 0) {
        return res.json({ success: true, tree: [] });
      }

      const directIds = directs.map(d => d.id);

      // 2. Fetch Level 2 grandchildren, settled transactions, passup logs, and sale ledger
      const [{ data: subDirects }, { data: txRecords }, { data: passupRecords }, { data: ledgerRecords }] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, email, referral_code, is_active, joining_date, direct_referrals_count, team_size, total_income, sponsor_id')
          .in('sponsor_id', directIds)
          .order('joining_date', { ascending: true }),
        supabase
          .from('transactions')
          .select('order_id, utr_number, zap_key_used, buyer_user_id, beneficiary_user_id, sponsor_id, sale_number, is_passup, transaction_type, amount, payment_status, created_at')
          .eq('payment_status', 'SUCCESS')
          .or(`sponsor_id.eq.${nodeId},beneficiary_user_id.eq.${nodeId},buyer_user_id.in.(${directIds.join(',')}),sponsor_id.in.(${directIds.join(',')})`),
        supabase
          .from('passup_logs')
          .select('original_referrer_id, passed_to_upline_id, sale_number, amount, passup_reason, created_at')
          .or(`original_referrer_id.eq.${nodeId},passed_to_upline_id.eq.${nodeId},original_referrer_id.in.(${directIds.join(',')})`),
        supabase
          .from('sale_ledger')
          .select('sale_number, sponsor_id, buyer_user_id, beneficiary_user_id, is_passup, amount, created_at')
          .or(`sponsor_id.eq.${nodeId},beneficiary_user_id.eq.${nodeId},sponsor_id.in.(${directIds.join(',')})`)
      ]);

      // Filter out admin seed transactions
      const allTx = (txRecords || []).filter(t => {
        const txType = String(t.transaction_type || '').toUpperCase();
        const orderId = String(t.order_id || '').toUpperCase();
        const utr = String(t.utr_number || '').toUpperCase();
        const zapKey = String(t.zap_key_used || '').toUpperCase();
        return !(
          txType.includes('VIP') ||
          txType.includes('FREE_PASS') ||
          orderId.includes('VIP_SEED') ||
          utr.startsWith('SEED_') ||
          zapKey.includes('ADMIN_')
        );
      });

      const allPassups = passupRecords || [];
      const allLedger = ledgerRecords || [];
      const subList = subDirects || [];

      // Helper to compute downlines for a given sponsor, assigning known slot numbers first and then filling unused numbers
      function computeDownlines(sponsorId: string, memberList: any[], isDirectLevel: boolean) {
        const assignedByBuyer = new Map<string, { saleNumber: number; isPassup: boolean; utr: string | null; amount: number; beneficiaryId?: string }>();
        const takenSlots = new Set<number>();

        for (const m of memberList) {
          const mTx = allTx.find(t => t.buyer_user_id === m.id);
          const mLedger = allLedger.find(l => l.buyer_user_id === m.id && l.sponsor_id === sponsorId);
          const mPassup = allPassups.find(p => p.original_referrer_id === sponsorId && (p.sale_number === mTx?.sale_number || p.sale_number === mLedger?.sale_number));

          const rawNum = mLedger?.sale_number ?? mTx?.sale_number ?? mPassup?.sale_number;
          if (rawNum !== undefined && rawNum !== null && Number(rawNum) > 0) {
            const num = Number(rawNum);
            takenSlots.add(num);
            const isPass = Boolean(
              mLedger?.is_passup ?? 
              mTx?.is_passup ?? 
              mPassup ?? 
              (mLedger && mLedger.beneficiary_user_id !== sponsorId) ??
              (mTx && mTx.beneficiary_user_id !== sponsorId) ??
              (num === 1 || num === 3)
            );
            assignedByBuyer.set(m.id, {
              saleNumber: num,
              isPassup: isPass,
              utr: mTx?.utr_number || null,
              amount: Number(mLedger?.amount || mTx?.amount || 0),
              beneficiaryId: mLedger?.beneficiary_user_id || mTx?.beneficiary_user_id
            });
          }
        }

        // Chronologically assign unused slots to any member without settled transaction yet
        let nextSlot = 1;
        const getNextUnusedSlot = () => {
          while (takenSlots.has(nextSlot)) {
            nextSlot++;
          }
          takenSlots.add(nextSlot);
          return nextSlot;
        };

        const list = memberList.map((m) => {
          let assigned = assignedByBuyer.get(m.id);
          if (!assigned) {
            const slot = getNextUnusedSlot();
            const isPass = (slot === 1 || slot === 3);
            assigned = {
              saleNumber: slot,
              isPassup: isPass,
              utr: null,
              amount: 0,
              beneficiaryId: undefined
            };
          }

          const saleNum = assigned.saleNumber;
          const isPassUp = assigned.isPassup;

          if (isDirectLevel) {
            return {
              ...m,
              level: 1,
              sale_number: saleNum,
              saleNum: saleNum,
              saleNumber: saleNum,
              is_passup: isPassUp,
              isPassedUp: isPassUp,
              flowType: isPassUp ? 'PASS_UP' : 'DIRECT_KEEP',
              moneyReceived: (!isPassUp && assigned.amount) ? assigned.amount : (!isPassUp ? 5000 : 0),
              utr: assigned.utr,
              children: [] as any[]
            };
          } else {
            // Level 2 (child of direct, grandchild of nodeId)
            const isChildPassupToNode = Boolean(
              (assigned.beneficiaryId && assigned.beneficiaryId === nodeId) ||
              allPassups.some(p => p.original_referrer_id === m.sponsor_id && p.passed_to_upline_id === nodeId && p.sale_number === saleNum) ||
              (isPassUp && (saleNum === 1 || saleNum === 3))
            );

            return {
              ...m,
              level: 2,
              sale_number: saleNum,
              saleNum: saleNum,
              saleNumber: saleNum,
              is_passup: isPassUp,
              isPassedUp: isPassUp,
              isChildPassupToYou: isChildPassupToNode,
              didChildPayMe: isChildPassupToNode,
              childMoney: (isChildPassupToNode && assigned.amount) ? assigned.amount : (isChildPassupToNode ? 5000 : 0),
              utr: assigned.utr,
              children: [] as any[]
            };
          }
        });

        // Strictly sort by sale_number ASC
        list.sort((a, b) => (a.sale_number || 0) - (b.sale_number || 0));
        return list;
      }

      // Compute Level 1
      const level1List = computeDownlines(nodeId, directs, true);

      // Compute Level 2 for each direct
      const finalTree = level1List.map(directMember => {
        const directChildrenRaw = subList.filter(s => s.sponsor_id === directMember.id);
        const children = computeDownlines(directMember.id, directChildrenRaw, false);
        return {
          ...directMember,
          children
        };
      });

      return res.json({ success: true, tree: finalTree });
    } catch (err: any) {
      console.error('[Team Tree API] Server error:', err);
      return res.status(500).json({ success: false, error: err.message, tree: [] });
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
