-- ════════════════════════════════════════════════════════════════════════════
-- Iris — MOTEUR DE RELANCE AUTOMATIQUE (fondation base de données)
--
-- Ajoute le strict nécessaire pour qu'Iris relance les devis envoyés non signés
-- à J+3 / J+7 / J+14, sans casser la signature ni le tracking existants :
--   1. profiles.iris_enabled   → toggle ON/OFF par artisan (défaut ON).
--   2. quotes.page_viewed_at   → signal FIABLE « le client a ouvert la page de
--      signature » (distinct de viewed_at, qui est aussi écrit sur l'ouverture
--      d'EMAIL via le webhook Resend — peu fiable, non utilisé par Iris).
--   3. table quote_reminders   → trace des relances envoyées : anti-doublon
--      strict (UNIQUE quote_id+stage), historique et stats de la page Iris.
--
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) Toggle Iris par artisan ──────────────────────────────────────────────
-- Défaut TRUE : Iris est actif dès qu'un devis Pro est envoyé. L'artisan peut
-- le couper depuis la page Iris (OFF = aucune relance auto pour ce user).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iris_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── 2) Signal fiable « page de signature ouverte » ──────────────────────────
-- Écrit UNIQUEMENT par /api/quotes/[id]/track-view (montage de la page /sign).
-- viewed_at, lui, peut être déclenché par l'ouverture de l'email (webhook
-- Resend) → Iris ne s'y fie pas pour contextualiser la relance.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS page_viewed_at TIMESTAMPTZ;

-- ─── 3) Table : quote_reminders (trace des relances) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.quote_reminders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Le devis relancé. CASCADE : la trace n'a pas de sens sans le devis.
  quote_id          UUID        NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  -- Propriétaire (= quotes.user_id) pour RLS et stats par artisan.
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Palier de relance : j3 (douce), j7 (ferme), j14 (dernière).
  stage             TEXT        NOT NULL CHECK (stage IN ('j3', 'j7', 'j14')),
  -- Contexte au moment de l'envoi : le client avait-il ouvert la page /sign ?
  context           TEXT        NOT NULL DEFAULT 'not_viewed'
                                  CHECK (context IN ('viewed', 'not_viewed')),
  -- Canal : 'auto' (Iris) ou 'manual' (bouton relance de l'artisan).
  source            TEXT        NOT NULL DEFAULT 'auto'
                                  CHECK (source IN ('auto', 'manual')),

  email_to          TEXT,
  resend_message_id TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ANTI-DOUBLON STRICT : un palier donné n'est envoyé qu'une seule fois par
  -- devis, même si le cron tourne deux fois (le 2ᵉ insert échoue proprement).
  CONSTRAINT uq_quote_reminders_quote_stage UNIQUE (quote_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_quote_reminders_user_id  ON public.quote_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_reminders_quote_id ON public.quote_reminders(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_reminders_sent_at  ON public.quote_reminders(sent_at);

-- ─── RLS — accès propriétaire (lecture + insertion) ──────────────────────────
-- Le moteur Iris écrit via service_role (RLS bypassée). La relance MANUELLE
-- écrit via le client de session de l'artisan → policy INSERT owner nécessaire.
-- Log append-only : pas d'UPDATE/DELETE exposés.
ALTER TABLE public.quote_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_reminders_select" ON public.quote_reminders;
DROP POLICY IF EXISTS "quote_reminders_insert" ON public.quote_reminders;

CREATE POLICY "quote_reminders_select" ON public.quote_reminders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quote_reminders_insert" ON public.quote_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
