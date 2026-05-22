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

  const tvaNote =
    opts.vatStatus === "auto_entrepreneur_franchise" ||
    opts.vatStatus === "franchise"
      ? "TVA non applicable, art. 293 B du CGI"
      : null;

  return { generales, garanties, specifiques, tvaNote };
}
