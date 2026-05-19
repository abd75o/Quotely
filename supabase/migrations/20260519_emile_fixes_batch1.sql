-- ═══════════════════════════════════════════════════════
-- MIGRATION : Émile fixes batch 1
-- Date : 2026-05-19
-- 1) messages.tool_results JSONB         (C1 — tool history persistence)
-- 2) quotes UNIQUE(user_id, number)      (I3 — sequential numbering safety)
-- ═══════════════════════════════════════════════════════

-- 1. Persist tool results alongside tool calls so the conversation can be
--    replayed end-to-end after a refresh. Without this, Émile reloads a
--    conversation knowing he *called* saveQuoteDraft but not what it
--    returned, and can create a duplicate devis in the same thread.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS tool_results JSONB;

-- 2. Per-user uniqueness on quote numbers. The new sequential numbering
--    (QTL-YYYY-NNNNN) honours the French legal requirement of a continuous
--    series — this constraint hardens it against concurrent inserts so the
--    application can safely retry on conflict.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'unique_user_quote_number'
  ) THEN
    ALTER TABLE quotes
      ADD CONSTRAINT unique_user_quote_number UNIQUE (user_id, number);
  END IF;
END $$;
