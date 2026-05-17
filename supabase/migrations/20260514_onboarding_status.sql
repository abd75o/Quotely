-- ═══════════════════════════════════════════════════════
-- MIGRATION : onboarding_completed (V4)
-- Date : 2026-05-14
-- ═══════════════════════════════════════════════════════
-- Source of truth for the new 3-step onboarding wizard at
-- /dashboard/onboarding. The legacy `onboarded_at` timestamp
-- continues to exist for backward-compat; the new wizard sets
-- BOTH columns when the user finishes, so the middleware can
-- migrate over time without breaking existing accounts.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Backfill: any user who already completed the old onboarding
-- (onboarded_at IS NOT NULL) is considered onboarded under V4 too.
UPDATE profiles
SET onboarding_completed = TRUE
WHERE onboarded_at IS NOT NULL
  AND (onboarding_completed IS NULL OR onboarding_completed = FALSE);

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
ON profiles(onboarding_completed);

-- Verification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'onboarding_completed';
