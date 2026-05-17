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
  const specifiques = opts.typeClient === "particulier" ? B2C_BTP : [];

  const tvaNote =
    opts.vatStatus === "auto_entrepreneur_franchise" ||
    opts.vatStatus === "franchise"
      ? "TVA non applicable, art. 293 B du CGI"
      : null;

  return { generales, garanties, specifiques, tvaNote };
}
