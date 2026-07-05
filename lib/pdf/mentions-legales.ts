// Mentions légales par métier — version partagée entre PDF, email et page de
// signature. Source de vérité unique côté serveur. Aligné sur le tool
// getMentionsLegales d'Émile (lib/emile/tools.ts).

interface MentionsBlock {
  generales: string[];
  garanties: string[];
}

const MENTIONS_PAR_METIER: Record<string, MentionsBlock> = {
  plombier: {
    generales: [
      "Garantie décennale (numéro de police obligatoire)",
      "RC professionnelle obligatoire",
    ],
    garanties: ["Garantie décennale", "Garantie de parfait achèvement (1 an)"],
  },
  "plombier-chauffagiste": {
    generales: [
      "Garantie décennale (numéro de police obligatoire)",
      "RC professionnelle obligatoire",
    ],
    garanties: ["Garantie décennale", "Garantie de parfait achèvement (1 an)"],
  },
  electricien: {
    generales: [
      "Conformité NF C 15-100",
      "Garantie décennale",
    ],
    garanties: ["Garantie décennale", "Garantie biennale du matériel"],
  },
  peintre: {
    generales: ["Conformité NF DTU 59.1", "RC professionnelle"],
    garanties: ["Garantie biennale", "Garantie de parfait achèvement"],
  },
  carreleur: {
    generales: ["Conformité DTU 52.2", "Garantie décennale"],
    garanties: ["Garantie décennale"],
  },
  macon: {
    generales: ["Conformité DTU 20", "Garantie décennale", "RC professionnelle"],
    garanties: ["Garantie décennale"],
  },
  freelance: {
    generales: [
      "Conformité RGPD",
      "Droit applicable : droit français",
      "Juridiction compétente : tribunal du siège du prestataire",
    ],
    garanties: [],
  },
};

const B2C_BTP = [
  "Délai de rétractation : 14 jours (art. L221-18 Code de la consommation)",
  "Médiation de la consommation : coordonnées du médiateur à fournir sur demande",
];

/**
 * Mention pénalités B2B — obligatoire dès qu'on facture un professionnel
 * (art. L441-10 et D441-5 du Code de commerce). Le taux des pénalités est
 * traditionnellement fixé à 3× le taux d'intérêt légal ; on garde la
 * formulation générique parce que le taux légal change chaque semestre et
 * que le devis a vocation à survivre quelques mois.
 *
 * L'indemnité forfaitaire de 40 € est posée par décret (D441-5) et reste
 * fixe — on peut donc l'écrire en clair sans risquer d'obsolescence.
 */
const B2B_LATE_PAYMENT = [
  "En cas de retard de paiement, des pénalités au taux de 3 fois le taux d'intérêt légal en vigueur seront appliquées, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 et D441-5 du Code de commerce).",
];

export interface ResolvedMentions {
  generales: string[];
  garanties: string[];
  specifiques: string[];
  tvaNote: string | null;
}

// ─── Statut TVA — source de vérité unique ────────────────────────────────────
// Valeurs canoniques réellement stockées dans `profiles.vat_status` par
// l'onboarding (app/dashboard/onboarding), EntrepriseForm et
// ProfileCompletionModal : "auto_entrepreneur" | "assujetti" | "non_assujetti".
// Les alias hérités ("franchise", "auto_entrepreneur_franchise", "soumis") sont
// tolérés par résilience. ⚠️ BUG CORRIGÉ : resolveMentionsLegales testait
// auparavant "auto_entrepreneur_franchise"/"franchise" — des valeurs JAMAIS
// écrites en base — donc un auto-entrepreneur voyait "Assujetti TVA" sur son
// PDF et la mention art. 293 B n'apparaissait jamais.
const VAT_FRANCHISE = new Set([
  "auto_entrepreneur",
  "auto_entrepreneur_franchise",
  "franchise",
]);
const VAT_NON_ASSUJETTI = new Set(["non_assujetti"]);
const VAT_SUBJECT = new Set(["assujetti", "soumis"]);

function normalizeVatStatus(vatStatus?: string | null): string {
  return (vatStatus ?? "").toLowerCase().trim();
}

/** True uniquement quand l'entreprise est réellement assujettie à la TVA. */
export function isVatSubject(vatStatus?: string | null): boolean {
  return VAT_SUBJECT.has(normalizeVatStatus(vatStatus));
}

/**
 * True quand l'entreprise n'applique PAS de TVA : franchise en base
 * (auto-entrepreneur) OU non-assujetti. Source de vérité unique de
 * l'exonération, réutilisée par le system-prompt et l'outil calculateTVA
 * d'Émile pour qu'aucune copie de cette logique ne puisse diverger.
 */
export function isVatExempt(vatStatus?: string | null): boolean {
  const s = normalizeVatStatus(vatStatus);
  return VAT_FRANCHISE.has(s) || VAT_NON_ASSUJETTI.has(s);
}

/**
 * Mention légale TVA correspondant au statut :
 * - franchise / auto-entrepreneur → "TVA non applicable, art. 293 B du CGI"
 * - non assujetti                → "TVA non applicable" (293 B ne vise que la
 *   franchise en base, on ne cite donc pas l'article)
 * - assujetti / inconnu          → null (aucune mention d'exonération)
 */
export function resolveTvaNote(vatStatus?: string | null): string | null {
  const s = normalizeVatStatus(vatStatus);
  if (VAT_FRANCHISE.has(s)) return "TVA non applicable, art. 293 B du CGI";
  if (VAT_NON_ASSUJETTI.has(s)) return "TVA non applicable";
  return null;
}

export function resolveMentionsLegales(opts: {
  metier?: string | null;
  typeClient?: "particulier" | "professionnel" | null;
  vatStatus?: string | null;
}): ResolvedMentions {
  const key = (opts.metier ?? "").toLowerCase().trim();
  const profile = MENTIONS_PAR_METIER[key];
  const generales = profile?.generales ?? [
    "RC professionnelle",
    "Mentions légales de l'entreprise (SIRET, adresse, forme juridique)",
  ];
  const garanties = profile?.garanties ?? [];
  // Mentions client-spécifiques : B2C → rétractation + médiation ;
  // B2B → pénalités de retard + indemnité forfaitaire 40 € (obligatoires
  // sur tout devis pro, l'absence est sanctionnée par une amende
  // administrative jusqu'à 75 k€).
  const specifiques =
    opts.typeClient === "particulier"
      ? B2C_BTP
      : opts.typeClient === "professionnel"
        ? B2B_LATE_PAYMENT
        : [];

  const tvaNote = resolveTvaNote(opts.vatStatus);

  return { generales, garanties, specifiques, tvaNote };
}
