-- ═══════════════════════════════════════════════════════
-- MIGRATION : Cleanup tables legacy du Rédacteur
-- Date : 2026-05-15
-- ═══════════════════════════════════════════════════════
-- L'ancien module /dashboard/equipe/redacteur a été remplacé
-- par /dashboard/emile (Prompt 4B). Les tables agent_*
-- ne sont plus utilisées.
-- ═══════════════════════════════════════════════════════

DROP TABLE IF EXISTS agent_messages CASCADE;
DROP TABLE IF EXISTS agent_conversations CASCADE;
