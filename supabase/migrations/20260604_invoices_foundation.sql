-- ════════════════════════════════════════════════════════════════════════════
-- Module Facture — FONDATION BASE DE DONNÉES (étape 1)
-- Aucun PDF, aucune UI, aucun lien avec le flow de signature ici : juste la
-- table `invoices`, la numérotation séquentielle légale, les helpers SQL et RLS.
--
-- Conventions calquées sur `quotes` (cf. supabase/schema.sql) :
--   - propriétaire = user_id → auth.users(id) ON DELETE CASCADE
--   - RLS accès propriétaire (auth.uid() = user_id)
--   - trigger updated_at via public.update_updated_at_column()
--   - numéro par ARTISAN et par ANNÉE (comme QVI-YYYY-NNNNN) ; ici FAC-YYYY-NNNNN
--
-- ⚠️ NUMÉROTATION = OBLIGATION LÉGALE (BOI-TVA-DECLA-30-20-20) : suite continue,
-- sans trou ni doublon. On N'UTILISE PAS de SEQUENCE Postgres (laisse des trous
-- au rollback) : compteur dédié `invoice_counters` + allocation atomique via
-- UPSERT ... RETURNING (verrou de ligne) à l'intérieur de create_invoice, dans
-- la MÊME transaction que l'INSERT → le numéro n'est consommé que si la facture
-- est réellement committée.
--
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── TABLE : invoices ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Devis d'origine. SET NULL (et non CASCADE) : la facture est un document
  -- légal qui doit survivre à la suppression du devis.
  quote_id         UUID          REFERENCES public.quotes(id) ON DELETE SET NULL,

  -- Numéro affiché, ex. "FAC-2026-00001". Unique PAR ARTISAN (chaque entreprise
  -- tient sa propre série légale) — pas globalement, comme `quotes.number`.
  invoice_number   TEXT          NOT NULL,
  invoice_year     INTEGER       NOT NULL,           -- année → reset du compteur
  sequence_number  INTEGER       NOT NULL,           -- rang dans l'année (1,2,3…)

  type             TEXT          NOT NULL DEFAULT 'totale'
                                   CHECK (type IN ('acompte', 'solde', 'totale')),
  -- pending = générée mais pas envoyée, sent = envoyée au client.
  status           TEXT          NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'pending', 'sent')),

  -- Snapshot émetteur figé, exactement comme quotes.emitter_snapshot.
  emitter_snapshot JSONB,

  acompte_percent  NUMERIC(5,2),
  acompte_amount   NUMERIC(12,2),

  total_ht         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tva        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc        NUMERIC(12,2) NOT NULL DEFAULT 0,

  issued_at        DATE          NOT NULL DEFAULT CURRENT_DATE,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Garde-fous légaux (défense en profondeur en plus du compteur) :
  -- un numéro et un rang uniques par artisan & par année.
  CONSTRAINT uq_invoices_user_number   UNIQUE (user_id, invoice_number),
  CONSTRAINT uq_invoices_user_year_seq UNIQUE (user_id, invoice_year, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id  ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON public.invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number   ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);

-- updated_at automatique (réutilise la fonction partagée de schema.sql).
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── TABLE : invoice_counters (compteur séquentiel par artisan & année) ──────
-- Non accessible directement par les clients (RLS sans policy → tout refusé) :
-- seules les fonctions SECURITY DEFINER ci-dessous l'incrémentent, ce qui
-- empêche un client de fabriquer trous/doublons en réécrivant le compteur.
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year)
);


-- ─── FONCTION interne : allocation atomique du prochain rang ──────────────────
-- UPSERT ... RETURNING = incrément atomique sous verrou de ligne. Première
-- facture de l'année → 1 ; suivantes → +1. Reset implicite chaque année (la
-- clé (user_id, year) change). NON exposée aux clients.
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
-- Renvoie le numéro formaté "FAC-YYYY-NNNNN". ⚠️ CONSOMME un rang du compteur
-- (à n'utiliser que si on crée la facture juste après). L'identité vient de
-- auth.uid() — un client ne peut pas incrémenter le compteur d'un autre.
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
-- Le numéro est attribué ET la facture insérée dans la MÊME transaction :
-- si l'INSERT échoue, le rang n'est pas consommé (pas de trou). Identité et
-- propriété du devis vérifiées via auth.uid().
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
  -- Le devis lié, s'il est fourni, doit appartenir à l'artisan.
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


-- ─── RLS — mêmes politiques que quotes (accès propriétaire) ──────────────────
ALTER TABLE public.invoices         ENABLE ROW LEVEL SECURITY;
-- Compteur : RLS activé SANS policy → aucun accès direct client. Seules les
-- fonctions SECURITY DEFINER ci-dessus y touchent.
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

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
