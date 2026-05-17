-- ═══════════════════════════════════════════════════════
-- MIGRATION : multi-TVA breakdown on quotes
-- Date : 2026-05-14
-- ═══════════════════════════════════════════════════════
--
-- Bug fix : `quotes.tax_rate` historiquement stockait la moyenne
-- arithmétique des taux de TVA des lignes. Faux dès qu'un devis
-- mélange plusieurs taux (ex : 20% + 10% = 15% — incorrect).
--
-- Cette migration ajoute `tax_breakdown` JSONB qui stocke pour
-- chaque taux : base HT, montant TVA, total TTC.
--
-- Forme stockée :
--   {
--     "20": { "base": 400.00, "tax": 80.00,  "ttc": 480.00 },
--     "10": { "base": 500.00, "tax": 50.00,  "ttc": 550.00 }
--   }
--
-- `tax_amount` et `total` restent les sources de vérité numériques.
-- `tax_rate` est conservé pour rétro-compat des consommateurs
-- existants (PDF, page signature) mais n'est plus utilisé pour
-- recalculer un total — il pointe vers le taux dominant.

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS tax_breakdown JSONB DEFAULT '{}'::jsonb;

-- Index GIN pour requêtes éventuelles sur les taux utilisés
CREATE INDEX IF NOT EXISTS idx_quotes_tax_breakdown
  ON quotes USING gin (tax_breakdown);

-- Vérification finale
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quotes'
  AND column_name = 'tax_breakdown';
