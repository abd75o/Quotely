/**
 * Source unique pour toutes les variables légales / juridiques de Quovi.
 *
 * En Phase 4, Abdoulaye n'aura QU'À modifier ce fichier pour mettre à jour
 * les mentions légales, CGU, politique de confidentialité, cookies et RGPD.
 *
 * Toute valeur "[À COMPLÉTER]" est un placeholder à renseigner avant la mise
 * en production (immatriculation Quovi terminée).
 */

export const LEGAL_INFO = {
  // ── Identité commerciale ──────────────────────────────────────────────────
  nomCommercial: "Quovi",
  domaine: "quovi.fr",
  emailContact: "hello@quovi.fr",

  // ── Identité juridique (à compléter une fois la société immatriculée) ────
  raisonSociale: "[À COMPLÉTER]",
  formeJuridique: "[À COMPLÉTER]",
  capital: "[À COMPLÉTER]",
  siret: "[À COMPLÉTER]",
  rcs: "[À COMPLÉTER]",
  numeroTvaIntra: "[À COMPLÉTER]",
  regimeTva: "[À COMPLÉTER]",

  // ── Adresse du siège ─────────────────────────────────────────────────────
  adresse: "[À COMPLÉTER]",
  codePostal: "[À COMPLÉTER]",
  ville: "[À COMPLÉTER]",
  pays: "France",

  // ── Représentation ───────────────────────────────────────────────────────
  directeurPublication: "Abdoulaye Dembele",
  dpo: "Non désigné — l'entreprise compte moins de 250 salariés et ne réalise pas de traitement à grande échelle de données sensibles (art. 37 RGPD).",

  // ── Hébergement & sous-traitants RGPD ────────────────────────────────────
  hebergeurFront: {
    nom: "Netlify, Inc.",
    adresse: "44 Montgomery Street, Suite 300, San Francisco, CA 94104, USA",
    pays: "États-Unis",
    garantieTransfert: "Data Privacy Framework (DPF)",
    politiqueUrl: "https://www.netlify.com/privacy",
  },
  hebergeurBackend: {
    nom: "Supabase, Inc.",
    adresse: "970 Toa Payoh North #07-04, Singapore 318992",
    pays: "Singapour — serveurs basés à Francfort (UE)",
    garantieTransfert: "Données stockées en UE (région eu-central-1)",
    politiqueUrl: "https://supabase.com/privacy",
  },
  paiement: {
    nom: "Stripe Payments Europe Ltd",
    adresse: "1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irlande",
    pays: "Irlande (UE)",
    politiqueUrl: "https://stripe.com/privacy",
  },
  ia: {
    nom: "Anthropic, PBC",
    adresse: "548 Market Street, PMB 90375, San Francisco, CA 94104, USA",
    pays: "États-Unis",
    garantieTransfert: "Data Privacy Framework (DPF)",
    politiqueUrl: "https://www.anthropic.com/legal/privacy",
    engagement:
      "Les requêtes envoyées à l'IA via l'API Anthropic ne sont jamais utilisées pour entraîner les modèles (politique par défaut Anthropic API).",
  },

  // ── Tarifs ───────────────────────────────────────────────────────────────
  prixStarter: "25 €/mois",
  prixPro: "49 €/mois",
  dureeEssai: "14 jours",

  // ── Versionning ──────────────────────────────────────────────────────────
  dateDerniereMaj: "3 mai 2026",
} as const;

export type LegalInfo = typeof LEGAL_INFO;
