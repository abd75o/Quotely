export interface ProfileForSend {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  company_name?: string | null;
  siret?: string | null;
  address?: string | null;
  metier?: string | null;
  metier_principal?: string | null;
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
  return { ok: missing.length === 0, missing };
}
