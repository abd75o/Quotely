-- Snapshot figé des infos émetteur (profil artisan) au moment de l'envoi.
--
-- RÈGLE MÉTIER : un devis status='draft' lit le profil en LIVE (toute édition du
-- profil se reflète immédiatement dans l'aperçu/PDF du brouillon). Dès qu'il est
-- envoyé (status='sent'/'signed'), les infos émetteur sont FIGÉES : on stocke ici
-- le profil exact utilisé pour rendre le PDF envoyé, et le PDF/page de signature
-- relisent ce snapshot au lieu du profil vivant. Ainsi, si l'artisan modifie son
-- SIRET, son adresse ou son statut TVA après l'envoi, le devis déjà envoyé reste
-- inchangé (intégrité juridique du document transmis au client).
--
-- Lu DÉFENSIVEMENT côté app (requête séparée) pour que l'absence de la colonne
-- sur un déploiement partiel ne casse ni l'envoi ni la génération du PDF.
--
-- Idempotent — safe to re-run.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS emitter_snapshot JSONB;
