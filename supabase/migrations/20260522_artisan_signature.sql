-- ═══════════════════════════════════════════════════════
-- MIGRATION : Signature artisan (réutilisée sur tous les devis)
-- Date : 2026-05-22
-- ═══════════════════════════════════════════════════════
--
-- L'artisan signe SA propre entreprise une seule fois (canvas tactile),
-- le PNG est stocké dans le bucket `signatures` au path
-- `<user_id>/signature.png` et l'URL publique est dénormalisée sur
-- `profiles.signature_url`. Le PDF (lib/pdf/quote-template.tsx) lit déjà
-- ce champ via `PdfProfile.signature_url` et le rend dans le bloc
-- "Bon pour accord" côté entreprise — pas de changement template.
--
-- Le workflow Émile bloque `sendQuote` quand `signature_url IS NULL` et
-- pousse le marker [SYSTEM] open_signature_modal pour ouvrir la modale.
-- ═══════════════════════════════════════════════════════

-- ── 1. Colonnes profile ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_url        TEXT,
  ADD COLUMN IF NOT EXISTS signature_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.signature_url IS
  'Public URL of the artisan signature PNG (bucket signatures/<user_id>/signature.png). NULL until the artisan completes the canvas modal — sendQuote refuses to ship without it.';
COMMENT ON COLUMN public.profiles.signature_updated_at IS
  'Bumped each time the signature is (re)uploaded. Lets the PDF cache-bust the image URL with ?v=<timestamp>.';

-- ── 2. Bucket Storage (public, 1 Mo cap) ────────────────
-- Public read mirrors `company-logos` so the PDF renderer (which fetches
-- via the public URL during server-side @react-pdf rendering) can pull
-- the image without a signed URL round-trip.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures',
  'signatures',
  TRUE,
  1 * 1024 * 1024,
  ARRAY['image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 3. RLS policies (same shape as company_logos) ──────
-- Each user owns the folder `<auth.uid()>/` and can only mutate objects
-- under it. Reads are open because the PDF endpoint is public via
-- signature_token and may render server-side without a session.
DROP POLICY IF EXISTS "signatures_read"   ON storage.objects;
DROP POLICY IF EXISTS "signatures_insert" ON storage.objects;
DROP POLICY IF EXISTS "signatures_update" ON storage.objects;
DROP POLICY IF EXISTS "signatures_delete" ON storage.objects;

CREATE POLICY "signatures_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'signatures');

CREATE POLICY "signatures_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "signatures_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "signatures_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 4. Vérification ────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name  = 'profiles'
  AND column_name IN ('signature_url', 'signature_updated_at')
ORDER BY column_name;
