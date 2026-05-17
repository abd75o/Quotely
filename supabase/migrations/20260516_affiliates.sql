-- ═══════════════════════════════════════════════════════
-- MIGRATION : Système d'affiliation (3 tables)
-- Date : 2026-05-16
-- ═══════════════════════════════════════════════════════
-- - affiliates : ambassadeurs B2B avec promo_code + tier + commission_rate.
--   Création contrôlée par l'admin (pas d'INSERT côté client — service_role
--   uniquement). RLS : un affilié ne voit que sa propre ligne.
-- - affiliate_referrals : lien affilié ↔ user inscrit via son code.
-- - affiliate_commissions : calcul mensuel des commissions dues + payouts
--   Stripe Connect.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  promo_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(3,2) DEFAULT 0.30,
  duration_months INTEGER DEFAULT 12,
  lifetime_residual_rate DECIMAL(3,2) DEFAULT 0,
  tier TEXT CHECK (tier IN ('standard', 'vip', 'strategic')) DEFAULT 'standard',
  stripe_connect_account_id TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'paused', 'terminated')) DEFAULT 'pending',
  total_clients_referred INTEGER DEFAULT 0,
  total_revenue_generated DECIMAL(12,2) DEFAULT 0,
  total_commission_paid DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_used TEXT,
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  first_payment_date TIMESTAMPTZ,
  months_active INTEGER DEFAULT 0,
  months_remaining_commission INTEGER DEFAULT 12,
  status TEXT CHECK (status IN ('active', 'expired', 'churned')) DEFAULT 'active',
  -- Un même user ne peut être attribué qu'à un seul affilié.
  UNIQUE (referred_user_id)
);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES affiliate_referrals(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  stripe_transfer_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Une commission unique par (affilié, referral, mois)
  UNIQUE (affiliate_id, referral_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_affiliates_promo_code ON affiliates(promo_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id);

-- updated_at trigger sur affiliates
DROP TRIGGER IF EXISTS trg_affiliates_updated_at ON affiliates;
CREATE TRIGGER trg_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Un affilié lit sa propre fiche. Toute écriture passe par le service_role
-- (route admin) — il n'y a pas de policy INSERT/UPDATE/DELETE côté client.
DROP POLICY IF EXISTS "Affiliates view own data" ON affiliates;
CREATE POLICY "Affiliates view own data" ON affiliates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Affiliates view own referrals" ON affiliate_referrals;
CREATE POLICY "Affiliates view own referrals" ON affiliate_referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = affiliate_referrals.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Affiliates view own commissions" ON affiliate_commissions;
CREATE POLICY "Affiliates view own commissions" ON affiliate_commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = affiliate_commissions.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Vérification
SELECT 'affiliates' as table_name, COUNT(*) as col_count
  FROM information_schema.columns WHERE table_name = 'affiliates'
UNION ALL
SELECT 'affiliate_referrals', COUNT(*)
  FROM information_schema.columns WHERE table_name = 'affiliate_referrals'
UNION ALL
SELECT 'affiliate_commissions', COUNT(*)
  FROM information_schema.columns WHERE table_name = 'affiliate_commissions';
