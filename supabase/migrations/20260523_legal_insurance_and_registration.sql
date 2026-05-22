-- ═══════════════════════════════════════════════════════
-- MIGRATION : Mentions légales obligatoires — assurances + immatriculation
-- Date : 2026-05-23
-- ═══════════════════════════════════════════════════════
--
-- Comble deux trous identifiés dans l'audit conformité :
--
--   * Décennale + RC pro : le PDF (lib/pdf/quote-template.tsx
--     LegalMentions block) rendait déjà ces lignes si la data
--     était présente, mais aucune voie de saisie n'existait —
--     dead code. Cette migration ajoute les 5 colonnes, le
--     formulaire EntrepriseForm + l'allowlist /api/profile
--     suivent dans le même commit applicatif.
--
--   * Immatriculation RCS / RM : obligatoire selon la forme
--     juridique (RCS pour sociétés, RM pour artisans/EI).
--     Deux colonnes (numéro + ville) pour couvrir les deux
--     formats — le label affiché par le formulaire et le PDF
--     dérive de profiles.legal_status.
--
-- Tout est IF NOT EXISTS / nullable / sans default, donc idempotent
-- et non destructeur sur les profils existants.
-- ═══════════════════════════════════════════════════════

BEGIN;

-- ── Assurances ─────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS decennale_company TEXT,
  ADD COLUMN IF NOT EXISTS decennale_number  TEXT,
  ADD COLUMN IF NOT EXISTS decennale_zone    TEXT,
  ADD COLUMN IF NOT EXISTS rc_pro_company    TEXT,
  ADD COLUMN IF NOT EXISTS rc_pro_number     TEXT;

COMMENT ON COLUMN public.profiles.decennale_company IS
  'Nom de l''assureur de la garantie décennale (ex: AXA, MAAF). Obligatoire pour les métiers BTP du bâtiment.';
COMMENT ON COLUMN public.profiles.decennale_number IS
  'Numéro de police de la garantie décennale.';
COMMENT ON COLUMN public.profiles.decennale_zone IS
  'Zone géographique couverte (ex: France métropolitaine, Île-de-France). Texte libre.';
COMMENT ON COLUMN public.profiles.rc_pro_company IS
  'Assureur RC professionnelle. Optionnel mais recommandé.';
COMMENT ON COLUMN public.profiles.rc_pro_number IS
  'Numéro de police RC pro.';

-- ── Immatriculation (RCS / RM) ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS registration_city   TEXT;

COMMENT ON COLUMN public.profiles.registration_number IS
  'Numéro RCS (sociétés) ou RM (artisans). Typiquement le SIREN à 9 chiffres. Label/format dérive de profiles.legal_status côté UI et PDF.';
COMMENT ON COLUMN public.profiles.registration_city IS
  'Ville d''immatriculation pour le RCS (ex: Paris, Lyon). Ignoré pour le RM.';

COMMIT;

-- ── Vérification ───────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
  AND column_name IN (
    'decennale_company',
    'decennale_number',
    'decennale_zone',
    'rc_pro_company',
    'rc_pro_number',
    'registration_number',
    'registration_city'
  )
ORDER BY column_name;
