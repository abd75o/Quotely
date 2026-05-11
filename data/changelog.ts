export type ChangelogStatus = "in-progress" | "released" | "soon";

export type ChangelogItem = {
  id: string;
  status: ChangelogStatus;
  title: string;
  description: string;
  date?: string;
  category?: "Émile" | "Iris" | "Plateforme" | "Intégrations" | "Théo" | "Léa";
};

export type ChangelogGroup = {
  period: string;
  items: ChangelogItem[];
};

export const changelog: ChangelogGroup[] = [
  {
    period: "EN COURS · MAI 2026",
    items: [
      {
        id: "launch-2026",
        status: "in-progress",
        title: "Lancement public de Quovi",
        description:
          "Quovi est officiellement lancé. 3 plans disponibles : Gratuit (5 devis/mois), Starter (25€/mois), Pro (49€/mois). Émile et Iris sont prêts à bosser pour vous.",
        date: "Mai 2026",
        category: "Plateforme",
      },
    ],
  },
  {
    period: "DISPONIBLE · AVRIL 2026",
    items: [
      {
        id: "modeles-par-metier",
        status: "released",
        title: "Modèles par métier",
        description:
          "Émile s’adapte à votre activité. Plombier, électricien, peintre, freelance, consultant — Émile connaît votre vocabulaire et vos tarifs marché.",
        date: "Avril 2026",
        category: "Émile",
      },
      {
        id: "tva-auto",
        status: "released",
        title: "Calcul TVA automatique",
        description:
          "Plus jamais d’erreur. Émile applique 5,5 %, 10 % ou 20 % selon le contexte (rénovation, neuf, prestation de service).",
        date: "Avril 2026",
        category: "Émile",
      },
      {
        id: "mentions-legales",
        status: "released",
        title: "Mentions légales par métier",
        description:
          "Émile injecte automatiquement les mentions obligatoires de votre métier (garantie décennale, droits d’auteur, clauses RGPD…).",
        date: "Avril 2026",
        category: "Émile",
      },
      {
        id: "signature-eidas",
        status: "released",
        title: "Signature électronique eIDAS",
        description:
          "Conforme à la réglementation européenne. Le client signe sur son téléphone, le devis devient légalement contraignant.",
        date: "Avril 2026",
        category: "Plateforme",
      },
      {
        id: "iris-relances",
        status: "released",
        title: "Relances Iris J+3 / J+7 / J+14",
        description:
          "Iris surveille vos devis envoyés et relance vos prospects au bon moment, avec le bon ton. Stop automatique si réponse.",
        date: "Avril 2026",
        category: "Iris",
      },
      {
        id: "dashboard",
        status: "released",
        title: "Tableau de bord temps réel",
        description:
          "Vue d’ensemble : devis envoyés, signés, en attente, refusés. Vous savez toujours où vous en êtes.",
        date: "Avril 2026",
        category: "Plateforme",
      },
    ],
  },
  {
    period: "DISPONIBLE · MARS 2026",
    items: [
      {
        id: "beta-open",
        status: "released",
        title: "Ouverture beta privée",
        description:
          "Premières inscriptions ouvertes pour 50 utilisateurs fondateurs. Merci à eux pour leurs feedbacks.",
        date: "Mars 2026",
        category: "Plateforme",
      },
      {
        id: "rgpd",
        status: "released",
        title: "Hébergement France · RGPD",
        description:
          "Toutes vos données restent en France. Conforme RGPD. Vos clients ne servent jamais à entraîner d’IA externe.",
        date: "Mars 2026",
        category: "Plateforme",
      },
    ],
  },
  {
    period: "🔮 BIENTÔT",
    items: [
      {
        id: "emile-personas",
        status: "soon",
        title: "Émile s’adapte à votre métier",
        description:
          "Émile change de personnalité selon votre activité : plombier, freelance, photographe, consultant... Vocabulaire, prix marché et mentions légales spécialisés.",
        category: "Émile",
      },
      {
        id: "emile-prix-perso",
        status: "soon",
        title: "Émile apprend vos prix",
        description:
          "Au fil des devis créés, Émile mémorisera vos tarifs habituels et les appliquera automatiquement. Plus vous utilisez Quovi, plus Émile devient rapide.",
        category: "Émile",
      },
      {
        id: "theo-compta",
        status: "soon",
        title: "Théo · L’Assistant Compta",
        description:
          "Centralise vos devis, factures et paiements. Catégorise vos dépenses. Prépare votre déclaration URSSAF. Théo travaille avec votre expert-comptable, ne le remplace pas.",
        date: "À venir",
        category: "Théo",
      },
      {
        id: "lea-tresorerie",
        status: "soon",
        title: "Léa · La Gestionnaire de Trésorerie",
        description:
          "Anticipe vos encaissements et vos sorties (URSSAF, TVA, charges). Alerte si votre solde futur passe en négatif. Suggère combien provisionner pour les impôts.",
        date: "À venir",
        category: "Léa",
      },
    ],
  },
];

export const visionLongTerme: string[] = [
  "Application mobile iOS / Android",
  "Intégration comptables (Pennylane, Indy)",
  "Mode hors-ligne pour chantiers / déplacements",
  "Marketplace de modèles entre indépendants",
  "Émile multi-langues (espagnol, anglais, italien)",
];

/**
 * Récupère les 4 dernières items pour l'aperçu de la landing :
 * 1 EN COURS + 3 DISPONIBLE récents.
 */
export function getLatestForLanding(): ChangelogItem[] {
  const inProgress = changelog
    .filter((g) => g.period.includes("EN COURS"))
    .flatMap((g) => g.items);

  const released = changelog
    .filter((g) => g.period.includes("DISPONIBLE"))
    .flatMap((g) => g.items)
    .slice(0, 3);

  return [...inProgress, ...released].slice(0, 4);
}
