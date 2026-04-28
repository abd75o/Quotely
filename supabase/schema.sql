-- ============================================================
-- Quotely — Schéma SQL complet
-- À coller dans : Supabase Dashboard > SQL Editor > Run
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─── TABLE : profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  metier          TEXT,
  company         TEXT,
  telephone       TEXT,
  plan            TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro')),
  trial_ends_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  onboarded_at    TIMESTAMPTZ,
  reminder_scheduled BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─── TABLE : clients ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─── TABLE : quotes ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quotes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  number                TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('draft', 'pending', 'signed', 'refused', 'invoiced')),
  items                 JSONB DEFAULT '[]'::jsonb,
  subtotal              NUMERIC(12, 2) DEFAULT 0,
  tax_rate              NUMERIC(5, 2)  DEFAULT 20,
  tax_amount            NUMERIC(12, 2) DEFAULT 0,
  total                 NUMERIC(12, 2) DEFAULT 0,
  valid_until           TIMESTAMPTZ,
  notes                 TEXT,
  public_token          TEXT UNIQUE,
  signature_type        TEXT DEFAULT 'simple'
                          CHECK (signature_type IN ('simple', 'email_confirmed', 'yousign')),
  signed_at             TIMESTAMPTZ,
  refused_at            TIMESTAMPTZ,
  invoiced_at           TIMESTAMPTZ,
  yousign_procedure_id  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);


-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clients_user_id        ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id         ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status          ON public.quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_public_token    ON public.quotes(public_token);


-- ─── TRIGGER : updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── TRIGGER : auto-create profile on signup ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, plan, trial_ends_at)
  VALUES (NEW.id, 'trial', NOW() + INTERVAL '14 days')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes   ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- clients
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- quotes — accès propriétaire
DROP POLICY IF EXISTS "quotes_select"  ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert"  ON public.quotes;
DROP POLICY IF EXISTS "quotes_update"  ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete"  ON public.quotes;
DROP POLICY IF EXISTS "quotes_public"  ON public.quotes;

CREATE POLICY "quotes_select" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quotes_insert" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_update" ON public.quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quotes_delete" ON public.quotes FOR DELETE USING (auth.uid() = user_id);

-- quotes — accès public via token (page de signature client)
CREATE POLICY "quotes_public" ON public.quotes
  FOR SELECT USING (public_token IS NOT NULL AND status IN ('pending', 'signed'));
