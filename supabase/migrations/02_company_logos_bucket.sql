-- ============================================================
-- Migration 02 — Storage bucket pour les logos d'entreprise
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================
--
-- Bucket public 'company-logos' utilisé par le formulaire
-- /dashboard/parametres/entreprise pour téléverser un logo
-- (PNG / JPG / SVG, 2 Mo max). Le path écrit côté client suit
-- le format `<user_id>/logo.<ext>` — les policies forcent ce
-- préfixe pour qu'un utilisateur ne puisse pas écraser le logo
-- d'un autre.

-- 1. Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  TRUE,
  2 * 1024 * 1024,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Policies — chaque utilisateur gère uniquement son dossier
DROP POLICY IF EXISTS "company_logos_read"   ON storage.objects;
DROP POLICY IF EXISTS "company_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_update" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_delete" ON storage.objects;

-- Lecture publique (le bucket est public, mais on borde)
CREATE POLICY "company_logos_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'company-logos');

-- L'utilisateur ne peut écrire que dans son propre dossier
CREATE POLICY "company_logos_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "company_logos_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'company-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "company_logos_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
