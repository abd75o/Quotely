-- ============================================================
-- Migration 03 — Agent conversations & messages (Le Rédacteur)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type  TEXT         NOT NULL CHECK (agent_type IN ('redacteur','sentinelle','assistant')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_recent
  ON public.agent_conversations(user_id, agent_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID         NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT         NOT NULL CHECK (role IN ('user','assistant','system_flash')),
  content          TEXT,
  embed            JSONB,
  tool_calls       JSONB,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation
  ON public.agent_messages(conversation_id, created_at);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_conversations_select" ON public.agent_conversations;
DROP POLICY IF EXISTS "agent_conversations_insert" ON public.agent_conversations;
DROP POLICY IF EXISTS "agent_conversations_update" ON public.agent_conversations;
DROP POLICY IF EXISTS "agent_conversations_delete" ON public.agent_conversations;

CREATE POLICY "agent_conversations_select" ON public.agent_conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_conversations_insert" ON public.agent_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_conversations_update" ON public.agent_conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_conversations_delete" ON public.agent_conversations
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "agent_messages_select" ON public.agent_messages;
DROP POLICY IF EXISTS "agent_messages_insert" ON public.agent_messages;
DROP POLICY IF EXISTS "agent_messages_update" ON public.agent_messages;
DROP POLICY IF EXISTS "agent_messages_delete" ON public.agent_messages;

CREATE POLICY "agent_messages_select" ON public.agent_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_messages_insert" ON public.agent_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_messages_update" ON public.agent_messages
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_messages_delete" ON public.agent_messages
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_agent_conversations_updated_at ON public.agent_conversations;
CREATE TRIGGER trg_agent_conversations_updated_at
  BEFORE UPDATE ON public.agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
