-- ═══════════════════════════════════════════════════════
-- MIGRATION : Parrainage user-to-user
-- Date : 2026-05-16
-- ═══════════════════════════════════════════════════════
-- Chaque user a un referral_code unique. Lorsqu'un nouvel inscrit utilise
-- ce code (via cookie ?parrain=CODE), un row referrals est créé en status
-- 'pending'. Au premier paiement Stripe du filleul, le row passe en
-- 'converted' et un mois de crédit est accordé aux DEUX users
-- (referral_credits_months incrémenté pour chacun).
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'converted', 'rewarded')) DEFAULT 'pending',
  first_payment_date TIMESTAMPTZ,
  reward_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Empêche les doubles attributions pour un même filleul.
  UNIQUE (referred_id)
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_credits_months INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own referrals" ON referrals;
CREATE POLICY "Users view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Vérification
SELECT 'referrals' as table_name, COUNT(*) as col_count
  FROM information_schema.columns WHERE table_name = 'referrals'
UNION ALL
SELECT 'profiles.referral_code', COUNT(*)
  FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'referral_code';
