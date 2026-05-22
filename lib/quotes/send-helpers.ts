export interface ProfileForSend {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  company_name?: string | null;
  siret?: string | null;
  address?: string | null;
  metier?: string | null;
  metier_principal?: string | null;
  decennale_company?: string | null;
  decennale_number?: string | null;
}

/**
 * Métiers BTP — listés ici tous les slugs (EntrepriseForm + onboarding) qui
 * relèvent du bâtiment et donc exigent une garantie décennale (art. 1792
 * Code civil, art. L241-1 Code des assurances). Architecte y est inclus :
 * il a une décennale obligatoire spécifique (loi de 1977).
 *
 * Les métiers ambigus (`artisan`, `autre`) ne déclenchent pas le gate par
 * défaut — on préfère ne pas bloquer un freelance non-bâtiment qu'imposer
 * une mention à quelqu'un qui n'y est pas légalement tenu. Émile reste
 * libre de recommander la saisie côté chat sans la rendre bloquante.
 */
const BTP_TRADES_REQUIRING_DECENNALE = new Set([
  "plombier",
  "plombier-chauffagiste",
  "chauffagiste",
  "electricien",
  "peintre",
  "macon",
  "carreleur",
  "couvreur",
  "menuisier",
  "multi-services",
  "architecte",
]);

function isBtpTrade(p: ProfileForSend): boolean {
  const m = (p.metier_principal ?? p.metier ?? "").toLowerCase().trim();
  if (!m) return false;
  return BTP_TRADES_REQUIRING_DECENNALE.has(m);
}

export function checkProfileForSend(p: ProfileForSend | null | undefined): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!p) return { ok: false, missing: ["profil"] };
  if (!p.first_name && !p.last_name) missing.push("nom / prénom");
  if (!p.company && !p.company_name) missing.push("nom d'entreprise");
  if (!p.siret) missing.push("SIRET");
  if (!p.address) missing.push("adresse");
  if (!p.metier && !p.metier_principal) missing.push("métier principal");

  // Décennale gate : bloquant uniquement pour les métiers du bâtiment.
  // On exige assureur + numéro de police (les deux sont la combinaison
  // qu'exige la jurisprudence en cas de litige sur un chantier).
  if (isBtpTrade(p)) {
    if (!p.decennale_company || !p.decennale_number) {
      missing.push("garantie décennale (assureur + n° de police)");
    }
  }
  return { ok: missing.length === 0, missing };
}
