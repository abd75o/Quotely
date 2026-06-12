-- ════════════════════════════════════════════════════════════════════════════
-- Iris — RELANCES MANUELLES ILLIMITÉES (anti-spam 48h côté applicatif)
--
-- Contexte : la table quote_reminders (migration 20260608) portait une unicité
-- STRICTE `UNIQUE (quote_id, stage)` → maximum 3 lignes par devis (j3/j7/j14).
-- C'était l'anti-doublon d'Iris AUTO (un palier = un envoi). Mais ça empêchait
-- l'artisan de relancer MANUELLEMENT plus de 3 fois : au 4ᵉ clic, l'insert
-- échouait sur la contrainte → plus aucune trace → l'anti-spam 48h (qui lit la
-- dernière relance) devenait aveugle.
--
-- Correctif : on retire l'unicité stricte et on la remet UNIQUEMENT sur les
-- relances AUTO. Iris garde donc exactement sa garantie (1 palier auto = 1
-- envoi, même si le cron tourne deux fois), tandis que les relances manuelles
-- deviennent illimitées et toutes tracées (chaque envoi = une ligne sent_at,
-- base du cooldown 48h entre manuelles et de la coordination avec l'auto).
--
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) Retrait de l'unicité stricte (auto + manuel confondus) ───────────────
ALTER TABLE public.quote_reminders
  DROP CONSTRAINT IF EXISTS uq_quote_reminders_quote_stage;

-- ─── 2) Unicité partielle : anti-doublon Iris AUTO uniquement ─────────────────
-- Les relances manuelles (source='manual') ne sont PAS contraintes → un même
-- devis peut accumuler autant de relances manuelles que l'artisan le décide,
-- l'anti-spam 48h étant géré côté applicatif (route /remind + engine Iris).
CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_reminders_auto_stage
  ON public.quote_reminders (quote_id, stage)
  WHERE source = 'auto';
