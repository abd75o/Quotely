-- ============================================================
-- Migration 01 — Business settings on profiles
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Étend la table profiles avec les colonnes de configuration
-- entreprise (utilisées par /dashboard/parametres/entreprise) et
-- les identifiants Stripe (référencés par le webhook existant).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name           TEXT,
  ADD COLUMN IF NOT EXISTS siret                  TEXT,
  ADD COLUMN IF NOT EXISTS address                TEXT,
  ADD COLUMN IF NOT EXISTS postal_code            TEXT,
  ADD COLUMN IF NOT EXISTS city                   TEXT,
  ADD COLUMN IF NOT EXISTS vat_status             TEXT
    CHECK (vat_status IS NULL OR vat_status IN ('auto_entrepreneur','assujetti','non_assujetti')),
  ADD COLUMN IF NOT EXISTS vat_number             TEXT,
  ADD COLUMN IF NOT EXISTS iban                   TEXT,
  ADD COLUMN IF NOT EXISTS bic                    TEXT,
  ADD COLUMN IF NOT EXISTS logo_url               TEXT,
  ADD COLUMN IF NOT EXISTS primary_color          TEXT DEFAULT '#6366F1',
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles(stripe_customer_id);
