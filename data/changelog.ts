export type ChangelogStatus = "in-progress" | "released" | "soon";

export type ChangelogItem = {
  id: string;
  status: ChangelogStatus;
  title: string;
  description: string;
  date?: string;
  category?: "Émile" | "Iris" | "Plateforme" | "Intégrations";
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
          "Quovi est officiellement lancé. 2 plans (Starter 25€ et Pro 49€). Émile et Iris sont prêts à bosser pour artisans, freelances, consultants, commerçants et au-delà.",
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
        id: "iris-negociation",
        status: "soon",
        title: "Iris qui négocie",
        description:
          "Si un client tarde à répondre, Iris pourra proposer un échelonnement ou un geste commercial à votre approbation.",
        category: "Iris",
      },
      {
        id: "integration-pennylane",
        status: "soon",
        title: "Connexion Pennylane",
        description:
          "Quovi exporte automatiquement vos devis signés et factures dans Pennylane. Plus de double saisie, votre comptable a tout en temps réel.",
        date: "À venir",
        category: "Intégrations",
      },
      {
        id: "integration-indy",
        status: "soon",
        title: "Connexion Indy",
        description:
          "Pour les indépendants qui font leur compta sur Indy. Vos devis et factures Quovi remontent automatiquement, prêts pour vos déclarations.",
        date: "À venir",
        category: "Intégrations",
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
