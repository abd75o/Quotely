-- Acompte (% deposit) + free-form payment schedule on quotes.
--
-- Before this, saveQuoteDraft accepted `acompte_percent` but never wrote it
-- (the column didn't exist), and the PDF fabricated a hardcoded 30/40/30
-- "échéancier" nobody asked for. With these columns the PDF reflects EXACTLY
-- what the artisan configured: a simple acompte, a verbatim multi-line
-- schedule, or nothing.
--
-- Idempotent — safe to re-run.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS acompte_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS payment_terms   TEXT;
