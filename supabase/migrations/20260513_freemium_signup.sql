-- Migration: align the new-user pipeline with the freemium model.
-- Follow-up to 20260511_plan_free_default.sql.
--
-- - Adds `subscription_status` (defaults to 'active' for every existing row).
-- - Allows the `comptable` plan in the CHECK constraint.
-- - Updates `handle_new_user()` to insert plan='free' + subscription_status='active'
--   instead of plan='trial' + 14-day trial_ends_at.
-- - Stops populating `trial_ends_at` on new rows (column kept for legacy reads).
--
-- Apply manually against the live Supabase project.

BEGIN;

-- 1. New column with default 'active'. Existing rows get 'active' as well so
--    Free users created before this migration remain unblocked.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'canceled', 'past_due'));

UPDATE profiles SET subscription_status = 'active' WHERE subscription_status IS NULL;

-- 2. Refresh the plan CHECK constraint so 'comptable' is allowed.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check
    CHECK (plan IN ('free', 'starter', 'pro', 'comptable'));

-- 3. trial_ends_at is no longer populated on insert.
ALTER TABLE profiles
  ALTER COLUMN trial_ends_at DROP DEFAULT;

-- 4. Replace the trigger to write the new defaults.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, plan, subscription_status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMIT;
