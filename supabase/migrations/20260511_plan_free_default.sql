-- Migration: replace 'trial' plan with 'free' as the default new-user plan.
-- The 14-day Pro trial concept is removed; every new signup starts on Free.
--
-- Run this manually against the live Supabase project; the app code already
-- writes plan='free' for new profiles after this migration is applied.

BEGIN;

-- 1. Drop the existing CHECK constraint that limits plan to ('trial','starter','pro').
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- 2. Backfill: legacy 'trial' rows become 'free'. Nulls also normalised to 'free'.
UPDATE profiles
SET plan = 'free'
WHERE plan = 'trial' OR plan IS NULL;

-- 3. Re-add CHECK with the new allowed values.
ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'starter', 'pro'));

-- 4. New default for any future row that omits the plan column.
ALTER TABLE profiles
  ALTER COLUMN plan SET DEFAULT 'free';

-- 5. trial_ends_at is no longer meaningful; clear it on the rows that just
--    migrated. (Keeping the column for now to avoid breaking historical reads
--    elsewhere; drop in a later migration once nothing references it.)
UPDATE profiles
SET trial_ends_at = NULL
WHERE plan = 'free';

COMMIT;
