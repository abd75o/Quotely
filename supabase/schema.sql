-- ============================================================
-- Quovi — Schema SQL complet (PostgreSQL 15 / Supabase)
-- Coller dans : Supabase Dashboard > SQL Editor > Run
-- ============================================================


-- ─── TABLE : profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  metier              TEXT,
  company             TEXT,
  telephone           TEXT,
  plan                TEXT        DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'comptable')),
  subscription_status TEXT        DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  trial_ends_at       TIMESTAMPTZ, -- deprecated: kept nullable for legacy reads, no longer populated
  onboarded_at        TIMESTAMPTZ,
  reminder_scheduled  BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ─── TABLE : clients ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clients (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT,
  phone      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── TABLE : quotes ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quotes (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id            UUID           REFERENCES public.clients(id) ON DELETE SET NULL,
  number               TEXT           NOT NULL,
  status               TEXT           NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('draft','pending','signed','refused','invoiced')),
  items                JSONB          NOT NULL DEFAULT '[]'::jsonb,
  subtotal             NUMERIC(12,2)  NOT NULL DEFAULT 0,
  tax_rate             NUMERIC(5,2)   NOT NULL DEFAULT 20,
  tax_amount           NUMERIC(12,2)  NOT NULL DEFAULT 0,
  total                NUMERIC(12,2)  NOT NULL DEFAULT 0,
  valid_until          TIMESTAMPTZ,
  notes                TEXT,
  public_token         TEXT           UNIQUE,
  signature_type       TEXT           DEFAULT 'simple'
                                        CHECK (signature_type IN ('simple','email_confirmed','yousign')),
  signed_at            TIMESTAMPTZ,
  refused_at           TIMESTAMPTZ,
  invoiced_at          TIMESTAMPTZ,
  yousign_procedure_id TEXT,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clients_user_id     ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id      ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status       ON public.quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON public.quotes(public_token);


-- ─── FONCTION : updated_at automatique ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON public.quotes;
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── FONCTION : créer un profil à l'inscription ──────────────────────────────
-- SECURITY DEFINER avec SET search_path obligatoire (exigence Supabase 2024)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Freemium model (May 2026): every new signup lands on Free with an
  -- active subscription status. No more 14-day trial window.
  INSERT INTO public.profiles (id, plan, subscription_status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── RLS — Row Level Security ─────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes   ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- clients
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_select" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- quotes — accès propriétaire
DROP POLICY IF EXISTS "quotes_select" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete" ON public.quotes;
DROP POLICY IF EXISTS "quotes_public" ON public.quotes;

CREATE POLICY "quotes_select" ON public.quotes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quotes_insert" ON public.quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_update" ON public.quotes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quotes_delete" ON public.quotes
  FOR DELETE USING (auth.uid() = user_id);

-- quotes — lecture publique via token (page signature client)
CREATE POLICY "quotes_public" ON public.quotes
  FOR SELECT USING (public_token IS NOT NULL AND status IN ('pending','signed'));


-- ════════════════════════════════════════════════════════════════════════════
-- MODULE FACTURE
-- Miroir de la migration 20260604_invoices_foundation.sql. Mêmes conventions que
-- quotes (user_id → auth.users, trigger updated_at, RLS owner). Numérotation
-- légale CONTINUE (sans trou ni doublon) : pas de SEQUENCE Postgres, mais un
-- compteur dédié `invoice_counters` incrémenté atomiquement et un numéro attribué
-- dans la même transaction que l'INSERT (fonction create_invoice).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── TABLE : invoices ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Document légal : survit au devis (SET NULL et non CASCADE).
  quote_id         UUID          REFERENCES public.quotes(id) ON DELETE SET NULL,

  -- "FAC-2026-00001" — unique PAR ARTISAN (série légale propre à chaque
  -- entreprise), comme quotes.number. Pas d'unicité globale (multi-tenant).
  invoice_number   TEXT          NOT NULL,
  invoice_year     INTEGER       NOT NULL,           -- année → reset du compteur
  sequence_number  INTEGER       NOT NULL,           -- rang dans l'année (1,2,3…)

  type             TEXT          NOT NULL DEFAULT 'totale'
                                   CHECK (type IN ('acompte', 'solde', 'totale')),
  -- pending = générée mais pas envoyée, sent = envoyée au client.
  status           TEXT          NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'pending', 'sent')),

  emitter_snapshot JSONB,                            -- snapshot émetteur figé

  acompte_percent  NUMERIC(5,2),
  acompte_amount   NUMERIC(12,2),

  total_ht         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tva        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc        NUMERIC(12,2) NOT NULL DEFAULT 0,

  issued_at        DATE          NOT NULL DEFAULT CURRENT_DATE,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_invoices_user_number   UNIQUE (user_id, invoice_number),
  CONSTRAINT uq_invoices_user_year_seq UNIQUE (user_id, invoice_year, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id     ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id    ON public.invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number      ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── TABLE : invoice_counters (compteur séquentiel par artisan & année) ──────
-- RLS activé SANS policy → aucun accès direct client : seules les fonctions
-- SECURITY DEFINER ci-dessous l'incrémentent (pas de trou/doublon forçable).

CREATE TABLE IF NOT EXISTS public.invoice_counters (
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year)
);


-- ─── FONCTION interne : allocation atomique du prochain rang ──────────────────
-- UPSERT ... RETURNING = incrément atomique sous verrou de ligne. NON exposée.

CREATE OR REPLACE FUNCTION public._allocate_invoice_seq(p_user_id UUID, p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO public.invoice_counters (user_id, year, last_number)
  VALUES (p_user_id, p_year, 1)
  ON CONFLICT (user_id, year)
  DO UPDATE SET last_number = public.invoice_counters.last_number + 1
  RETURNING last_number INTO v_seq;
  RETURN v_seq;
END;
$$;
REVOKE ALL ON FUNCTION public._allocate_invoice_seq(UUID, INTEGER) FROM PUBLIC;


-- ─── FONCTION : prochain numéro de facture (atomique) ────────────────────────
-- Renvoie "FAC-YYYY-NNNNN". CONSOMME un rang (à n'utiliser qu'avant une
-- création). Identité via auth.uid().

CREATE OR REPLACE FUNCTION public.next_invoice_number(p_year INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID    := auth.uid();
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_seq  INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'next_invoice_number: utilisateur non authentifié';
  END IF;
  v_seq := public._allocate_invoice_seq(v_user, v_year);
  RETURN 'FAC-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_invoice_number(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(INTEGER) TO authenticated;


-- ─── FONCTION : create_invoice — allocation + INSERT atomiques ────────────────
-- Numéro attribué ET facture insérée dans la MÊME transaction (pas de trou si
-- l'INSERT échoue). Propriété du devis vérifiée via auth.uid().

CREATE OR REPLACE FUNCTION public.create_invoice(
  p_quote_id         UUID,
  p_type             TEXT,
  p_status           TEXT,
  p_emitter_snapshot JSONB,
  p_acompte_percent  NUMERIC,
  p_acompte_amount   NUMERIC,
  p_total_ht         NUMERIC,
  p_total_tva        NUMERIC,
  p_total_ttc        NUMERIC,
  p_issued_at        DATE
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   UUID    := auth.uid();
  v_issued DATE    := COALESCE(p_issued_at, CURRENT_DATE);
  v_year   INTEGER := EXTRACT(YEAR FROM v_issued)::INTEGER;
  v_seq    INTEGER;
  v_number TEXT;
  v_row    public.invoices;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'create_invoice: utilisateur non authentifié';
  END IF;
  IF p_quote_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = p_quote_id AND q.user_id = v_user
  ) THEN
    RAISE EXCEPTION 'create_invoice: devis % introuvable pour cet utilisateur', p_quote_id;
  END IF;

  v_seq    := public._allocate_invoice_seq(v_user, v_year);
  v_number := 'FAC-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');

  INSERT INTO public.invoices (
    user_id, quote_id, invoice_number, invoice_year, sequence_number,
    type, status, emitter_snapshot, acompte_percent, acompte_amount,
    total_ht, total_tva, total_ttc, issued_at
  ) VALUES (
    v_user, p_quote_id, v_number, v_year, v_seq,
    COALESCE(p_type, 'totale'), COALESCE(p_status, 'draft'),
    p_emitter_snapshot, p_acompte_percent, p_acompte_amount,
    COALESCE(p_total_ht, 0), COALESCE(p_total_tva, 0), COALESCE(p_total_ttc, 0),
    v_issued
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.create_invoice(UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invoice(UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE) TO authenticated;


-- ─── RLS — invoices (accès propriétaire, comme quotes) ───────────────────────

ALTER TABLE public.invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY; -- aucune policy = accès direct refusé

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE USING (auth.uid() = user_id);
