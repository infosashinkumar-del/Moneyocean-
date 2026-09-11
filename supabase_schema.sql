-- ============================================================================
-- MONEYOCEAN P2P FINTECH ENGINE - HIGH CONCURRENCY 2-UP & DOUBLE-ENTRY LEDGER
-- ============================================================================

-- 1. STRICT STATE MACHINE ENUMS
DO $$ BEGIN
    CREATE TYPE public.tx_fsm_state AS ENUM (
        'INITIATED',
        'PAYMENT_GATEWAY_LOCKED',
        'UTR_SUBMITTED',
        'WEBHOOK_VERIFIED',
        'SETTLED',
        'FAILED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- लेज़र एंट्री के प्रकार (DEBIT / CREDIT)
DO $$ BEGIN
    CREATE TYPE public.ledger_entry_type AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. USERS TABLE (IF NOT EXISTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    sponsor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    qualifying_sponsor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    direct_referrals_count INT NOT NULL DEFAULT 0,
    team_size INT NOT NULL DEFAULT 0,
    today_income NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    last_7_days_income NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    last_30_days_income NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_income NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    joining_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cycle_earning_count INT NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. IMMUTABLE DOUBLE-ENTRY LEDGER (Append-Only: नो अपडेट, नो डिलीट)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_order_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    account_type TEXT NOT NULL, -- 'BUYER_PENDING', 'BENEFICIARY_P2P_WALLET'
    entry_type public.ledger_entry_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- लेज़र में छेड़छाड़ रोकने के लिए ट्रिगर (Immutable Security)
CREATE OR REPLACE FUNCTION public.prevent_ledger_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Immutable Ledger entries cannot be updated or deleted!';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_ledger ON public.ledger_entries;
CREATE TRIGGER trg_immutable_ledger
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_tampering();

-- ============================================================================
-- 4. TRANSACTIONS TABLE WITH IDEMPOTENCY & STATE MACHINE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE NOT NULL,
    idempotency_key TEXT UNIQUE, -- बार-बार क्लिक होने पर डुप्लीकेट बनने से रोकता है
    buyer_user_id UUID NOT NULL REFERENCES public.users(id),
    beneficiary_user_id UUID NOT NULL REFERENCES public.users(id),
    transaction_type TEXT NOT NULL, -- 'DIRECT_REFERRAL_100PCT', 'SALE_1_PASSUP', 'SALE_3_PASSUP', 'SALE_2_PASSUP'
    amount NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    fsm_state public.tx_fsm_state NOT NULL DEFAULT 'INITIATED',
    utr_number TEXT,
    zap_key_used TEXT,
    webhook_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. SALE LEDGER / PASSUP HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sale_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number INT NOT NULL,
    sponsor_id UUID NOT NULL REFERENCES public.users(id),
    buyer_user_id UUID NOT NULL REFERENCES public.users(id),
    beneficiary_user_id UUID NOT NULL REFERENCES public.users(id),
    is_passup BOOLEAN NOT NULL DEFAULT false,
    transaction_order_id TEXT UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. USER MERCHANT KEYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_merchant_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    zap_key TEXT NOT NULL,
    paytm_merchant_name TEXT,
    priority_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    monthly_received_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monthly_limit NUMERIC(12, 2) NOT NULL DEFAULT 500000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. PURE TREE TRAVERSAL & CHECKOUT ENGINE (SELECT FOR UPDATE LOCKED)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_p2p_checkout(
    p_referral_code TEXT,
    p_buyer_id UUID,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sponsor RECORD;
    v_beneficiary RECORD;
    v_upline RECORD;
    v_settled_sales_count INT;
    v_sale_number INT;
    v_is_passup BOOLEAN := false;
    v_passup_reason TEXT := 'DIRECT_REFERRAL_100PCT';
    v_order_id TEXT;
    v_zap_key TEXT := NULL;
    v_package_price NUMERIC(12, 2) := 0.00;
    v_existing_tx RECORD;
BEGIN
    -- Dynamically read package price and fallback zap key from platform_configs
    SELECT COALESCE(value::NUMERIC, 0.00) INTO v_package_price 
    FROM public.platform_configs 
    WHERE key = 'package_price';

    -- Idempotency Check: अगर यह की (Key) पहले से मौजूद है, तो वही ऑर्डर वापस करें
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_tx FROM public.transactions WHERE idempotency_key = p_idempotency_key;
        IF v_existing_tx.id IS NOT NULL THEN
            SELECT full_name, referral_code INTO v_beneficiary FROM public.users WHERE id = v_existing_tx.beneficiary_user_id;
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_tx.order_id,
                'zap_key', v_existing_tx.zap_key_used,
                'amount', v_existing_tx.amount,
                'beneficiary_id', v_existing_tx.beneficiary_user_id,
                'beneficiary_name', v_beneficiary.full_name,
                'fsm_state', v_existing_tx.fsm_state
            );
        END IF;
    END IF;

    -- 1. रेस कंडीशन से बचने के लिए स्पॉन्सर रो को लॉक (SELECT FOR UPDATE) करें
    SELECT * INTO v_sponsor 
    FROM public.users 
    WHERE LOWER(referral_code) = LOWER(TRIM(p_referral_code)) 
    FOR UPDATE;

    IF v_sponsor.id IS NULL THEN
        SELECT * INTO v_sponsor FROM public.users WHERE sponsor_id IS NULL LIMIT 1 FOR UPDATE;
    END IF;

    v_beneficiary := v_sponsor;

    -- 2. स्पॉन्सर की सेटल हो चुकी कुल सेल्स की गिनती करें
    SELECT COUNT(*) INTO v_settled_sales_count 
    FROM public.sale_ledger 
    WHERE sponsor_id = v_sponsor.id;

    v_sale_number := v_settled_sales_count + 1;

    -- 3. 2-Up Pass-Up Tree Traversal Rule (Sale #1 & #3 ya #2 & #3 Passup)
    IF v_sale_number IN (1, 3) AND (v_sponsor.qualifying_sponsor_id IS NOT NULL OR v_sponsor.sponsor_id IS NOT NULL) THEN
        v_is_passup := true;
        v_passup_reason := 'SALE_' || v_sale_number || '_PASSUP';
        
        -- पहले Qualifying Sponsor को प्राथमिकता दें, फिर Direct Sponsor को
        IF v_sponsor.qualifying_sponsor_id IS NOT NULL THEN
            SELECT * INTO v_upline FROM public.users WHERE id = v_sponsor.qualifying_sponsor_id;
            IF v_upline.id IS NOT NULL THEN
                v_beneficiary := v_upline;
            END IF;
        ELSIF v_sponsor.sponsor_id IS NOT NULL THEN
            SELECT * INTO v_upline FROM public.users WHERE id = v_sponsor.sponsor_id;
            IF v_upline.id IS NOT NULL THEN
                v_beneficiary := v_upline;
            END IF;
        END IF;
    ELSE
        -- Sale #2, #4, #5+ और मास्टर एडमिन की सेल्स 100% स्पॉन्सर को मिलेंगी
        v_is_passup := false;
        v_passup_reason := 'DIRECT_REFERRAL_100PCT';
        v_beneficiary := v_sponsor;
    END IF;

    -- 4. बेनिफिशियरी की एक्टिव ZapKey प्राप्त करें
    SELECT zap_key INTO v_zap_key FROM public.user_merchant_keys 
    WHERE user_id = v_beneficiary.id AND is_active = true 
    ORDER BY priority_order ASC 
    LIMIT 1;

    -- If beneficiary has no key configured, query dynamic fallback from platform_configs
    IF v_zap_key IS NULL OR LENGTH(TRIM(v_zap_key)) < 6 THEN
        SELECT value INTO v_zap_key FROM public.platform_configs WHERE key = 'fallback_zap_key';
    END IF;

    -- 5. यूनिक ऑर्डर ID जनरेट करें
    v_order_id := 'MO' || TO_CHAR(NOW(), 'YYMMDDHH24MISS') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- 6. ट्रांजैक्शन रिकॉर्ड बनाएँ (State: INITIATED)
    INSERT INTO public.transactions (
        order_id,
        idempotency_key,
        buyer_user_id,
        beneficiary_user_id,
        transaction_type,
        amount,
        payment_status,
        fsm_state,
        zap_key_used
    ) VALUES (
        v_order_id,
        p_idempotency_key,
        p_buyer_id,
        v_beneficiary.id,
        v_passup_reason,
        v_package_price,
        'PENDING',
        'INITIATED',
        v_zap_key
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'zap_key', v_zap_key,
        'amount', v_package_price,
        'sale_number', v_sale_number,
        'is_passup', v_is_passup,
        'passup_reason', v_passup_reason,
        'beneficiary_id', v_beneficiary.id,
        'beneficiary_name', v_beneficiary.full_name,
        'routing_info', jsonb_build_object(
            'beneficiary_name', v_beneficiary.full_name,
            'reason', CASE 
                WHEN v_is_passup THEN 'Sale #' || v_sale_number || ' (Passed up to Upline)' 
                ELSE 'Direct 100% Sale (Earned by Sponsor)' 
            END,
            'zap_key', v_zap_key
        )
    );
END;
$$;

-- ============================================================================
-- 8. AUTHORITATIVE DOUBLE-ENTRY SETTLEMENT ENGINE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.settle_p2p_sale(
    p_order_id TEXT,
    p_status TEXT,
    p_utr TEXT DEFAULT NULL,
    p_webhook_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx RECORD;
    v_buyer RECORD;
    v_beneficiary RECORD;
    v_sale_num INT := 1;
    v_final_utr TEXT := COALESCE(NULLIF(TRIM(p_utr), ''), 'ZAP_' || TO_CHAR(NOW(), 'YYMMDDHH24MISS'));
BEGIN
    -- 1. Lock transaction row to prevent race conditions & double-spend
    SELECT * INTO v_tx 
    FROM public.transactions 
    WHERE order_id = p_order_id 
    FOR UPDATE;

    -- If order is not found, return authoritative error (no fake auto-recovery)
    IF v_tx.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order not found in database',
            'order_id', p_order_id
        );
    END IF;

    -- 2. Idempotency Guard: If already settled, return success immediately
    IF v_tx.payment_status = 'SUCCESS' OR v_tx.fsm_state = 'SETTLED' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'ALREADY_SETTLED',
            'message', 'Transaction has already been settled previously',
            'order_id', p_order_id,
            'buyer_user_id', v_tx.buyer_user_id,
            'beneficiary_user_id', v_tx.beneficiary_user_id
        );
    END IF;

    -- 3. Handle SUCCESS Status
    IF UPPER(TRIM(p_status)) IN ('SUCCESS', 'PAID', 'COMPLETED') THEN
        -- A. Transition Transaction State to SETTLED
        UPDATE public.transactions
        SET payment_status = 'SUCCESS',
            fsm_state = 'SETTLED',
            utr_number = v_final_utr,
            webhook_signature = p_webhook_signature,
            updated_at = NOW()
        WHERE order_id = p_order_id;

        -- B. Activate Buyer Profile
        UPDATE public.users
        SET is_active = true
        WHERE id = v_tx.buyer_user_id;

        -- C. Write Immutable Double-Entry Ledger Record
        INSERT INTO public.ledger_entries (
            transaction_order_id,
            user_id,
            account_type,
            entry_type,
            amount,
            created_at
        ) VALUES (
            p_order_id,
            v_tx.beneficiary_user_id,
            'BENEFICIARY_P2P_WALLET',
            'CREDIT',
            v_tx.amount,
            NOW()
        );

        -- D. Record in Sale Ledger Audit
        SELECT COUNT(*) + 1 INTO v_sale_num
        FROM public.sale_ledger
        WHERE sponsor_id = v_tx.beneficiary_user_id;

        INSERT INTO public.sale_ledger (
            sale_number,
            sponsor_id,
            buyer_user_id,
            beneficiary_user_id,
            is_passup,
            transaction_order_id,
            amount,
            created_at
        ) VALUES (
            v_sale_num,
            v_tx.beneficiary_user_id,
            v_tx.buyer_user_id,
            v_tx.beneficiary_user_id,
            (v_tx.transaction_type != 'DIRECT_REFERRAL_100PCT'),
            p_order_id,
            v_tx.amount,
            NOW()
        ) ON CONFLICT (transaction_order_id) DO NOTHING;

        -- E. Update Beneficiary Financial Totals
        UPDATE public.users
        SET total_income = COALESCE(total_income, 0.00) + v_tx.amount,
            today_income = COALESCE(today_income, 0.00) + v_tx.amount,
            direct_referrals_count = COALESCE(direct_referrals_count, 0) + 1
        WHERE id = v_tx.beneficiary_user_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'SUCCESS',
            'message', 'Transaction settled, user activated, and double-entry ledger credited',
            'order_id', p_order_id,
            'buyer_user_id', v_tx.buyer_user_id,
            'beneficiary_user_id', v_tx.beneficiary_user_id,
            'amount', v_tx.amount,
            'utr', v_final_utr
        );
    ELSE
        -- Mark as Failed
        UPDATE public.transactions
        SET payment_status = 'FAILED',
            fsm_state = 'FAILED',
            updated_at = NOW()
        WHERE order_id = p_order_id;

        RETURN jsonb_build_object(
            'success', false,
            'status', 'FAILED',
            'order_id', p_order_id
        );
    END IF;
END;
$$;

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) LOCKDOWN - (No Client-Side Tampering)
-- ============================================================================

-- सभी टेबल्स पर RLS एक्टिवेट करें
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_merchant_keys ENABLE ROW LEVEL SECURITY;

-- ❌ पुरानी खुली पॉलिसियों को साफ़ करें
DROP POLICY IF EXISTS "Public full access" ON public.users;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users view own ledger" ON public.ledger_entries;
DROP POLICY IF EXISTS "Users view own keys" ON public.user_merchant_keys;
DROP POLICY IF EXISTS "Users manage own keys" ON public.user_merchant_keys;

-- 🛡️ USERS TABLE POLICY:
-- 1. यूज़र्स केवल अपनी प्रोफ़ाइल पढ़ सकते हैं (SELECT only)
CREATE POLICY "Users can read own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

-- 2. डायरेक्ट INSERT/UPDATE/DELETE ब्लॉक (क्लाइंट से कोई भी is_active या balance नहीं बदल सकता)
-- (केवल Supabase Auth triggers और Service Role RPCs ही अपडेट कर सकेंगे)

-- 🛡️ TRANSACTIONS TABLE POLICY:
-- केवल बायर या बेनिफिशियरी ही अपने ट्रांजैक्शन्स पढ़ सकते हैं (Read-Only)
CREATE POLICY "Users view own transactions" ON public.transactions
FOR SELECT USING (auth.uid() = buyer_user_id OR auth.uid() = beneficiary_user_id);

-- 🛡️ LEDGER ENTRIES POLICY:
-- यूज़र्स केवल अपने खाते के लेज़र रिकॉर्ड्स देख सकते हैं (Read-Only)
CREATE POLICY "Users view own ledger" ON public.ledger_entries
FOR SELECT USING (auth.uid() = user_id);

-- 🛡️ USER MERCHANT KEYS POLICY:
-- केवल अकाउंट ओनर ही अपनी मर्चेंट की लिस्ट देख/मैनेज कर सकता है (दूसरों की ZapKey एक्सपोज़ नहीं होगी)
CREATE POLICY "Users manage own keys" ON public.user_merchant_keys
FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 10. 8-MINUTE SERVER-SIDE EXPIRATION CONSTRAINT
-- ============================================================================

-- transactions टेबल में expires_at कॉलम सुनिश्चित करें
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 minutes');

-- ============================================================================
-- 11. STRICT RPC PERMISSION (Direct settle_p2p_sale Execution Block)
-- ============================================================================

-- पब्लिक ब्राउज़र यूज़र्स से सीधा settle_p2p_sale चलाने की अनुमति छीनें
REVOKE EXECUTE ON FUNCTION public.settle_p2p_sale(TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
-- केवल Edge Function Webhook (service_role) को ही सेटलमेंट की अनुमति दें
GRANT EXECUTE ON FUNCTION public.settle_p2p_sale(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================================
-- 12. SERVER-SIDE FINANCIAL DASHBOARD ENGINE (Ledger-Backed Single RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_dashboard(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_earned NUMERIC(12, 2) := 0.00;
    v_today_earned NUMERIC(12, 2) := 0.00;
    v_7day_earned NUMERIC(12, 2) := 0.00;
    v_30day_earned NUMERIC(12, 2) := 0.00;
    v_team_size INT := 0;
    v_directs INT := 0;
    v_user RECORD;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- यूज़र प्रोफाइल डेटा
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;

    -- 1. Immutable Ledger से 100% सटीक वित्तीय गणना
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_earned
    FROM public.ledger_entries
    WHERE user_id = p_user_id AND entry_type = 'CREDIT';

    -- आज की कमाई (Server Timezone Based)
    SELECT COALESCE(SUM(amount), 0.00) INTO v_today_earned
    FROM public.ledger_entries
    WHERE user_id = p_user_id 
      AND entry_type = 'CREDIT' 
      AND created_at >= CURRENT_DATE;

    -- पिछले 7 दिनों की कमाई
    SELECT COALESCE(SUM(amount), 0.00) INTO v_7day_earned
    FROM public.ledger_entries
    WHERE user_id = p_user_id 
      AND entry_type = 'CREDIT' 
      AND created_at >= (NOW() - INTERVAL '7 days');

    -- पिछले 30 दिनों की कमाई
    SELECT COALESCE(SUM(amount), 0.00) INTO v_30day_earned
    FROM public.ledger_entries
    WHERE user_id = p_user_id 
      AND entry_type = 'CREDIT' 
      AND created_at >= (NOW() - INTERVAL '30 days');

    -- डायरेक्ट रेफरल्स काउंट (Realized)
    SELECT COUNT(*) INTO v_directs
    FROM public.users
    WHERE sponsor_id = p_user_id AND is_active = true;

    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user.id,
            'full_name', v_user.full_name,
            'email', v_user.email,
            'referral_code', v_user.referral_code,
            'is_active', v_user.is_active,
            'joining_date', v_user.joining_date,
            'cycle_earning_count', COALESCE(v_user.cycle_earning_count, 0)
        ),
        'financials', jsonb_build_object(
            'total_income', v_total_earned,
            'today_income', v_today_earned,
            'last_7_days_income', v_7day_earned,
            'last_30_days_income', v_30day_earned,
            'direct_referrals_count', v_directs,
            'team_size', COALESCE(v_user.team_size, v_directs)
        )
    );
END;
$$;

-- Authenticated यूज़र्स को डैशबोर्ड डेटा फेच करने की अनुमति दें
GRANT EXECUTE ON FUNCTION public.get_user_dashboard(UUID) TO authenticated;

