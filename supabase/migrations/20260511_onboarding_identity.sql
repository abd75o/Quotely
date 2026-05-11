-- Migration: identity columns required by the 3-step onboarding.
-- Run manually in the Supabase SQL editor. Uses `telephone` (existing column)
-- for the phone field — no `phone` column is added.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name   TEXT,
  ADD COLUMN IF NOT EXISTS last_name    TEXT,
  ADD COLUMN IF NOT EXISTS legal_status TEXT
    CHECK (legal_status IS NULL OR legal_status IN
      ('auto-entrepreneur','ei','eurl','sarl','sas','autre'));

COMMIT;
