-- ═══════════════════════════════════════════════════════
-- MIGRATION : Tracking devis (envoi / ouverture / signature)
-- Date : 2026-05-16
-- ═══════════════════════════════════════════════════════

-- 1. Colonnes de tracking
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signature_token UUID
  DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN IF NOT EXISTS signature_data JSONB,
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS sent_to_email TEXT,
ADD COLUMN IF NOT EXISTS resend_message_id TEXT;

-- 2. Index pour la page signature publique
CREATE INDEX IF NOT EXISTS idx_quotes_signature_token
  ON quotes(signature_token);

CREATE INDEX IF NOT EXISTS idx_quotes_resend_message_id
  ON quotes(resend_message_id);

-- 3. Status workflow étendu
ALTER TABLE quotes
DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes
ADD CONSTRAINT quotes_status_check
CHECK (status IN ('draft', 'sent', 'viewed',
  'signed', 'refused', 'expired'));

-- 4. RLS policy : la page publique de signature doit
-- pouvoir lire un quote par son signature_token
DROP POLICY IF EXISTS "Public can view quote by signature token" ON quotes;
CREATE POLICY "Public can view quote by signature token"
ON quotes
FOR SELECT
USING (signature_token IS NOT NULL);

-- 5. Vérification finale
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'quotes'
  AND column_name IN ('sent_at', 'viewed_at',
    'signed_at', 'signature_token', 'signature_data',
    'pdf_url', 'sent_to_email', 'resend_message_id')
ORDER BY column_name;
