-- Anti-bruteforce de la signature publique (/sign/[token]).
--
-- La page de signature valide que le NOM saisi correspond au destinataire
-- enregistré. Pour empêcher de deviner ce nom par essais successifs, on
-- compte les échecs par devis et on bloque 15 min après 5 tentatives ratées.
-- État stocké sur la ligne du devis → robuste en serverless (Netlify), pas
-- de mémoire process à conserver.
--
--   sign_attempts      : nb d'échecs de validation du nom consécutifs.
--   sign_blocked_until  : si renseigné et dans le futur → signature bloquée.
--
-- Lu/écrit DÉFENSIVEMENT côté app (requêtes séparées, erreurs avalées) : si la
-- colonne n'est pas encore migrée, la signature continue de fonctionner, seul
-- l'anti-bruteforce est temporairement inactif.
--
-- Idempotent — safe to re-run.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS sign_attempts     INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sign_blocked_until TIMESTAMPTZ;
