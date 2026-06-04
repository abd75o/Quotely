-- ════════════════════════════════════════════════════════════════════════════
-- Facture générée par un événement SYSTÈME (ex. signature du devis).
--
-- create_invoice (20260604) dérive l'utilisateur de auth.uid() : impossible à
-- utiliser depuis la route de signature, où le signataire est anonyme et l'écriture
-- passe par le service_role (auth.uid() = NULL). On ajoute donc une variante qui
-- prend le user_id EXPLICITE (le propriétaire du devis), réservée au service_role
-- — jamais aux clients (anon/authenticated) pour qu'on ne puisse pas forger une
-- facture au nom d'autrui.
--
-- Même garantie légale que create_invoice : allocation atomique du numéro via
-- _allocate_invoice_seq + INSERT dans la même transaction (pas de trou).
--
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_invoice_for_user(
  p_user_id          UUID,
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
  v_issued DATE    := COALESCE(p_issued_at, CURRENT_DATE);
  v_year   INTEGER := EXTRACT(YEAR FROM v_issued)::INTEGER;
  v_seq    INTEGER;
  v_number TEXT;
  v_row    public.invoices;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'create_invoice_for_user: user_id requis';
  END IF;
  -- Le devis lié, s'il est fourni, doit appartenir à CE user (pas d'usurpation).
  IF p_quote_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = p_quote_id AND q.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'create_invoice_for_user: devis % introuvable pour user %', p_quote_id, p_user_id;
  END IF;

  v_seq    := public._allocate_invoice_seq(p_user_id, v_year);
  v_number := 'FAC-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');

  INSERT INTO public.invoices (
    user_id, quote_id, invoice_number, invoice_year, sequence_number,
    type, status, emitter_snapshot, acompte_percent, acompte_amount,
    total_ht, total_tva, total_ttc, issued_at
  ) VALUES (
    p_user_id, p_quote_id, v_number, v_year, v_seq,
    COALESCE(p_type, 'totale'), COALESCE(p_status, 'pending'),
    p_emitter_snapshot, p_acompte_percent, p_acompte_amount,
    COALESCE(p_total_ht, 0), COALESCE(p_total_tva, 0), COALESCE(p_total_ttc, 0),
    v_issued
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Réservé au service_role (déclencheurs serveur). Jamais exposé aux clients.
REVOKE ALL ON FUNCTION public.create_invoice_for_user(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invoice_for_user(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE
) TO service_role;
