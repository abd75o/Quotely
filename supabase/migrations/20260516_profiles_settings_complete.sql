-- ═══════════════════════════════════════════════════════
-- MIGRATION : Profiles settings — close gap with code
-- Date : 2026-05-16
-- ═══════════════════════════════════════════════════════
--
-- Code audit (Step 3 of the audit report) found two columns
-- referenced by SELECT statements in production code but never
-- added to the public.profiles table. Without these the queries
-- 42703 ("column does not exist") which breaks two flows:
--
--   * /sign/[token]                       — signature page reads
--                                           profiles.couleur_principale
--                                           and crashes on render.
--   * POST /api/quotes/[id]/sign          — same column SELECTed,
--                                           422 returned to the
--                                           public signature endpoint.
--   * POST /api/emile/chat                — falls back to
--                                           profiles.tva_status when
--                                           profiles.vat_status is null.
--                                           SELECT "*" so today it
--                                           silently returns undefined;
--                                           adding the column makes the
--                                           fallback meaningful instead
--                                           of dead code.
--
-- This migration also reasserts ALL columns the dashboard
-- /dashboard/parametres/entreprise form upserts, with IF NOT EXISTS,
-- so any environment that skipped a previous migration converges.
-- The form upsert payload (components/dashboard/EntrepriseForm.tsx)
-- is the source of truth.
--
-- Nothing destructive: only ADD COLUMN IF NOT EXISTS + defaults.
-- ═══════════════════════════════════════════════════════

BEGIN;

-- ─── Missing columns identified by the diff ──────────────
-- couleur_principale : French alias for primary_color, read by
-- the public signature page and the sign API. Code prefers it
-- over primary_color, so we default to the same brand value to
-- avoid an empty header on first render.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS couleur_principale TEXT DEFAULT '#4f3050';

-- tva_status : legacy French alias for vat_status, used as a
-- fallback in app/api/emile/chat/route.ts. Free-form text — keep
-- it nullable, no CHECK, so it never blocks a write.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tva_status TEXT;

-- ─── Defensive re-assertions (idempotent) ────────────────
-- These columns SHOULD already exist via earlier migrations, but we
-- ADD COLUMN IF NOT EXISTS so this single file is enough to bring
-- a stale environment up to spec.

-- Identity / company (01_business_settings.sql + 20260511_onboarding_identity.sql)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name    TEXT,
  ADD COLUMN IF NOT EXISTS last_name     TEXT,
  ADD COLUMN IF NOT EXISTS company       TEXT,
  ADD COLUMN IF NOT EXISTS company_name  TEXT,
  ADD COLUMN IF NOT EXISTS telephone     TEXT,
  ADD COLUMN IF NOT EXISTS metier        TEXT,
  ADD COLUMN IF NOT EXISTS metier_principal TEXT,
  ADD COLUMN IF NOT EXISTS specialites   TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS legal_status  TEXT,
  ADD COLUMN IF NOT EXISTS siret         TEXT,
  ADD COLUMN IF NOT EXISTS address       TEXT,
  ADD COLUMN IF NOT EXISTS postal_code   TEXT,
  ADD COLUMN IF NOT EXISTS city          TEXT;

-- Fiscalité / banque
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vat_status    TEXT,
  ADD COLUMN IF NOT EXISTS vat_number    TEXT,
  ADD COLUMN IF NOT EXISTS iban          TEXT,
  ADD COLUMN IF NOT EXISTS bic           TEXT;

-- Apparence
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_url      TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#4f3050';

-- Stripe / subscription
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id              TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id          TEXT,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Émile toggles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS toggle_price_memory BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS toggle_suggestions  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS toggle_smart_alerts BOOLEAN DEFAULT TRUE;

-- Onboarding V4
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Parrainage user-to-user
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code           TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_credits_months INTEGER DEFAULT 0;

-- Back-fill couleur_principale from primary_color where one is set
-- and the other is null. Lets existing users keep their brand color
-- without re-saving the form.
UPDATE public.profiles
  SET couleur_principale = primary_color
  WHERE couleur_principale IS NULL
    AND primary_color IS NOT NULL;

UPDATE public.profiles
  SET primary_color = couleur_principale
  WHERE primary_color IS NULL
    AND couleur_principale IS NOT NULL;

-- Same idea for tva_status / vat_status (one-shot sync).
UPDATE public.profiles
  SET tva_status = vat_status
  WHERE tva_status IS NULL
    AND vat_status IS NOT NULL;

COMMIT;

-- ─── Verification ────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;
