-- ═══════════════════════════════════════════════════════
-- MIGRATION : Schema Émile (conversations + apprentissage)
-- Date : 2026-05-14
-- ═══════════════════════════════════════════════════════

-- 1. Table conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  related_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 2. Table messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
  content TEXT,
  tool_calls JSONB,
  tool_call_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 3. Table user_prestations (apprentissage des prix)
CREATE TABLE IF NOT EXISTS user_prestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  unite TEXT,
  prix_moyen NUMERIC(10, 2),
  prix_min NUMERIC(10, 2),
  prix_max NUMERIC(10, 2),
  nb_utilisations INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_prestations_user_id ON user_prestations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prestations_libelle ON user_prestations(libelle);

-- 4. Trigger updated_at sur conversations
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_conversations_updated_at();

-- 5. Ajouter les colonnes manquantes à profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS metier_principal TEXT,
ADD COLUMN IF NOT EXISTS specialites TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS toggle_price_memory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS toggle_suggestions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS toggle_smart_alerts BOOLEAN DEFAULT TRUE;

-- 6. RLS Policies (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prestations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own prestations" ON user_prestations;
CREATE POLICY "Users can view own prestations" ON user_prestations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own prestations" ON user_prestations;
CREATE POLICY "Users can manage own prestations" ON user_prestations
  FOR ALL USING (auth.uid() = user_id);

-- 7. Vérification finale
SELECT 'conversations' as table_name, COUNT(*) FROM information_schema.columns WHERE table_name = 'conversations'
UNION ALL
SELECT 'messages', COUNT(*) FROM information_schema.columns WHERE table_name = 'messages'
UNION ALL
SELECT 'user_prestations', COUNT(*) FROM information_schema.columns WHERE table_name = 'user_prestations';
