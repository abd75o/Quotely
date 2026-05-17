-- Migration: extend the `clients` table for the dashboard Clients page.
-- Apply manually in the Supabase SQL editor before relying on the new UI.
-- The dashboard code references these columns but degrades gracefully if
-- they are absent (queries select them with NULL fallbacks).
--
-- Columns added :
--   first_name      — split out from `name` for B2C clients
--   type_client     — 'particulier' | 'professionnel'
--   siret           — B2B identifier (nullable)
--   postal_code     — postal code (5 chars in FR)
--   city            — city
--   tags            — text[] — Pro-only multi-select (Régulier, VIP, …)
--   notes           — free-form textarea
--   updated_at      — auto-managed via trigger

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS first_name   TEXT,
  ADD COLUMN IF NOT EXISTS type_client  TEXT
    CHECK (type_client IS NULL OR type_client IN ('particulier', 'professionnel')),
  ADD COLUMN IF NOT EXISTS siret        TEXT,
  ADD COLUMN IF NOT EXISTS postal_code  TEXT,
  ADD COLUMN IF NOT EXISTS city         TEXT,
  ADD COLUMN IF NOT EXISTS tags         TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
