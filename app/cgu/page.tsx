import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { LEGAL_INFO } from "@/lib/legal-info";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Quotely",
  description:
    "Conditions générales d'utilisation de Quotely : abonnement, paiement, résiliation, obligations et responsabilités.",
  robots: { index: true, follow: true },
};

const SECTIONS = [
  { id: "preambule", label: "1. Préambule et définitions" },
  { id: "objet", label: "2. Objet" },
  { id: "acceptation", label: "3. Acceptation et modification" },
  { id: "compte", label: "4. Création de compte" },
  { id: "abonnements", label: "5. Abonnements et tarifs" },
  { id: "paiement", label: "6. Paiement" },
  { id: "resiliation", label: "7. Renouvellement et résiliation" },
  { id: "retractation", label: "8. Droit de rétractation" },
  { id: "obligations-user", label: "9. Obligations de l'utilisateur" },
  { id: "obligations-quotely", label: "10. Obligations de Quotely" },
  { id: "propriete", label: "11. Propriété intellectuelle" },
  { id: "responsabilite", label: "12. Limitation de responsabilité" },
  { id: "force-majeure", label: "13. Force majeure" },
  { id: "rgpd", label: "14. Confidentialité et RGPD" },
  { id: "modification", label: "15. Modification des CGU" },
  { id: "manquement", label: "16. Résiliation pour manquement" },
  { id: "droit", label: "17. Droit applicable" },
];

export default function CGUPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
          Conditions générales d&apos;utilisation
        </h1>
        <div className="inline-block px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] mb-10">
          <p className="text-xs text-[var(--text-secondary)]">
            Dernière mise à jour : <span className="font-semibold">{LEGAL_INFO.dateDerniereMaj}</span>
          </p>
        </div>

        <nav aria-label="Sommaire" className="mb-12 p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
            Sommaire
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-[var(--primary)] hover:underline cursor-pointer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12 text-[var(--text-secondary)] leading-relaxed">
          <section id="preambule">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              1. Préambule et définitions
            </h2>
            <p className="mb-3">
              Les présentes Conditions Générales d&apos;Utilisation (ci-après «&nbsp;CGU&nbsp;») régissent
              l&apos;accès et l&apos;utilisation du service {LEGAL_INFO.nomCommercial}, édité par {LEGAL_INFO.raisonSociale},
              accessible à l&apos;adresse {LEGAL_INFO.domaine}.
            </p>
            <ul className="space-y-2 pl-5 list-disc marker:text-[var(--text-muted)]">
              <li><span className="font-semibold text-[var(--text-primary)]">Service&nbsp;:</span> la plateforme SaaS Quotely permettant la création, l&apos;envoi, le suivi et la signature électronique de devis professionnels.</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Utilisateur&nbsp;:</span> toute personne morale ou physique agissant dans le cadre de son activité professionnelle qui utilise le Service.</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Compte&nbsp;:</span> espace personnel créé par l&apos;Utilisateur pour accéder au Service.</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Devis&nbsp;:</span> document commercial créé via le Service, comportant les prestations, prix, conditions et signature client.</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Plan&nbsp;:</span> formule d&apos;abonnement souscrite par l&apos;Utilisateur (Starter ou Pro).</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Abonnement&nbsp;:</span> contrat mensuel sans engagement entre l&apos;Utilisateur et {LEGAL_INFO.nomCommercial}.</li>
            </ul>
          </section>

          <section id="objet">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">2. Objet</h2>
            <p>
              Les présentes CGU ont pour objet de définir les conditions dans lesquelles {LEGAL_INFO.nomCommercial} met
              à disposition de l&apos;Utilisateur un service en ligne de gestion et signature de devis. Le Service est
              destiné exclusivement à un usage professionnel.
            </p>
          </section>

          <section id="acceptation">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              3. Acceptation et modification des CGU
            </h2>
            <p className="mb-3">
              L&apos;inscription au Service vaut acceptation pleine et entière des présentes CGU. L&apos;Utilisateur
              déclare avoir pris connaissance des CGU et les accepter sans réserve.
            </p>
            <p>
              {LEGAL_INFO.nomCommercial} se réserve le droit de modifier les CGU à tout moment. L&apos;Utilisateur sera
              informé de toute modification substantielle par email avec un préavis de 30 jours avant l&apos;entrée
              en vigueur des nouvelles CGU.
            </p>
          </section>

          <section id="compte">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              4. Création de compte
            </h2>
            <p className="mb-3">
              La création d&apos;un Compte requiert une adresse email valide et un mot de passe. L&apos;Utilisateur
              déclare en s&apos;inscrivant agir dans le cadre de son activité professionnelle.
            </p>
            <p>
              L&apos;Utilisateur s&apos;engage à fournir des informations exactes lors de l&apos;inscription et à les
              maintenir à jour. Il est seul responsable de la confidentialité de ses identifiants de connexion.
            </p>
          </section>

          <section id="abonnements">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              5. Abonnements et tarifs
            </h2>
            <p className="mb-3">
              Le Service est proposé en deux formules d&apos;abonnement&nbsp;:
            </p>
            <ul className="space-y-2 pl-5 list-disc marker:text-[var(--text-muted)] mb-3">
              <li><span className="font-semibold text-[var(--text-primary)]">Starter&nbsp;: {LEGAL_INFO.prixStarter}</span> — limité à 30 devis par mois.</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Pro&nbsp;: {LEGAL_INFO.prixPro}</span> — devis illimités, dictée vocale, IA, relances automatiques, statistiques avancées.</li>
            </ul>
            <p className="mb-3">
              Une période d&apos;essai gratuite de <span className="font-semibold text-[var(--text-primary)]">{LEGAL_INFO.dureeEssai}</span>{" "}
              du plan Pro est offerte à toute nouvelle inscription, sans demande de carte bancaire.
            </p>
            <p>
              Régime de TVA applicable&nbsp;: {LEGAL_INFO.regimeTva}. Les tarifs sont susceptibles d&apos;évoluer&nbsp;;
              les changements ne s&apos;appliqueront aux abonnements en cours qu&apos;après notification par email
              avec un préavis de 30 jours.
            </p>
          </section>

          <section id="paiement">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              6. Modalités de paiement
            </h2>
            <p className="mb-3">
              Le paiement de l&apos;abonnement est effectué par prélèvement automatique mensuel via le prestataire
              Stripe Payments Europe Ltd (Irlande, UE). Les moyens de paiement acceptés sont la carte bancaire et,
              le cas échéant, les autres moyens proposés via Stripe.
            </p>
            <p>
              {LEGAL_INFO.nomCommercial} ne stocke aucune donnée bancaire&nbsp;: l&apos;ensemble des informations de
              paiement est hébergé et traité par Stripe, certifié PCI-DSS niveau 1. La facture mensuelle est
              accessible depuis l&apos;espace «&nbsp;Facturation&nbsp;» du Compte.
            </p>
          </section>

          <section id="resiliation">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              7. Renouvellement et résiliation
            </h2>
            <p className="mb-3">
              L&apos;Abonnement est <span className="font-semibold text-[var(--text-primary)]">sans engagement</span> et
              se renouvelle automatiquement à la fin de chaque période mensuelle.
            </p>
            <p>
              L&apos;Utilisateur peut résilier son abonnement à tout moment, en un clic, depuis la page «&nbsp;Facturation&nbsp;»
              de son Compte. La résiliation prend effet à la fin de la période en cours&nbsp;: l&apos;accès au Service
              est maintenu jusqu&apos;à cette date, et aucun nouveau prélèvement n&apos;est effectué.
            </p>
          </section>

          <section id="retractation">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              8. Droit de rétractation
            </h2>
            <p className="mb-3">
              Le Service étant destiné exclusivement à un usage professionnel, le droit de rétractation prévu
              aux articles L221-18 et suivants du Code de la consommation n&apos;est{" "}
              <span className="font-semibold text-[var(--text-primary)]">pas applicable</span>, conformément à
              l&apos;article L221-3 du même code.
            </p>
            <p className="text-sm italic">
              Cette stipulation est susceptible d&apos;être confirmée ou ajustée par un juriste avant la mise en
              production effective du Service.
            </p>
          </section>

          <section id="obligations-user">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              9. Obligations de l&apos;utilisateur
            </h2>
            <p className="mb-3">L&apos;Utilisateur s&apos;engage à&nbsp;:</p>
            <ul className="space-y-1.5 pl-5 list-disc marker:text-[var(--text-muted)]">
              <li>fournir des données exactes et à jour&nbsp;;</li>
              <li>n&apos;utiliser le Service que dans le cadre légal et pour son usage professionnel&nbsp;;</li>
              <li>ne pas adresser de devis non sollicités à des destinataires sans leur consentement préalable (interdiction du spam)&nbsp;;</li>
              <li>ne pas revendre, sous-licencier ou redistribuer tout ou partie du Service&nbsp;;</li>
              <li>ne pas tenter de contourner les mesures de sécurité, ni d&apos;accéder à des données ne lui appartenant pas&nbsp;;</li>
              <li>respecter les droits de propriété intellectuelle de {LEGAL_INFO.nomCommercial} et des tiers.</li>
            </ul>
          </section>

          <section id="obligations-quotely">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              10. Obligations de Quotely
            </h2>
            <p className="mb-3">{LEGAL_INFO.nomCommercial} s&apos;engage à&nbsp;:</p>
            <ul className="space-y-1.5 pl-5 list-disc marker:text-[var(--text-muted)]">
              <li>mettre tout en œuvre pour assurer la disponibilité du Service avec un objectif <span className="font-semibold text-[var(--text-primary)]">best-effort de 99&nbsp;%</span> sur l&apos;année&nbsp;;</li>
              <li>réaliser des sauvegardes quotidiennes via son hébergeur Supabase&nbsp;;</li>
              <li>informer les Utilisateurs de toute interruption planifiée par notification dans l&apos;application ou par email&nbsp;;</li>
              <li>traiter les données personnelles dans le respect du RGPD (voir{" "}
                <Link href="/politique-confidentialite" className="text-[var(--primary)] hover:underline">
                  politique de confidentialité
                </Link>).
              </li>
            </ul>
          </section>

          <section id="propriete">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              11. Propriété intellectuelle
            </h2>
            <p className="mb-3">
              {LEGAL_INFO.nomCommercial} conserve l&apos;intégralité des droits de propriété intellectuelle sur
              le Service, son code source, sa marque, son interface et son contenu éditorial.
            </p>
            <p>
              L&apos;Utilisateur conserve <span className="font-semibold text-[var(--text-primary)]">l&apos;entière
              propriété de ses données</span> (devis, fichiers clients, logos, documents). {LEGAL_INFO.nomCommercial}
              ne dispose que du droit limité de les héberger et de les traiter pour exécuter le Service.
            </p>
          </section>

          <section id="responsabilite">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              12. Limitation de responsabilité
            </h2>
            <p className="mb-3">
              La responsabilité de {LEGAL_INFO.nomCommercial} envers l&apos;Utilisateur, tous préjudices confondus,
              est limitée au montant des sommes effectivement versées par l&apos;Utilisateur au titre de son
              abonnement <span className="font-semibold text-[var(--text-primary)]">au cours des 12 derniers
              mois</span> précédant le fait générateur du dommage.
            </p>
            <p>
              {LEGAL_INFO.nomCommercial} ne saurait être tenu responsable des dommages indirects, perte de chiffre
              d&apos;affaires, perte de données ou perte d&apos;opportunité.
            </p>
          </section>

          <section id="force-majeure">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              13. Force majeure
            </h2>
            <p>
              Aucune des parties ne pourra être tenue responsable d&apos;un manquement à ses obligations résultant
              d&apos;un cas de force majeure tel que défini par l&apos;article 1218 du Code civil et la jurisprudence,
              notamment&nbsp;: catastrophes naturelles, panne généralisée des réseaux télécoms, attaque
              informatique massive, décision d&apos;une autorité publique.
            </p>
          </section>

          <section id="rgpd">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              14. Confidentialité et RGPD
            </h2>
            <p>
              Le traitement des données personnelles est régi par notre{" "}
              <Link href="/politique-confidentialite" className="text-[var(--primary)] hover:underline">
                Politique de confidentialité
              </Link>{" "}
              et conforme au Règlement Général sur la Protection des Données (UE&nbsp;2016/679). L&apos;Utilisateur
              dispose des droits décrits dans la page{" "}
              <Link href="/rgpd" className="text-[var(--primary)] hover:underline">RGPD</Link>.
            </p>
          </section>

          <section id="modification">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              15. Modification des CGU
            </h2>
            <p>
              Toute modification substantielle des CGU sera notifiée à l&apos;Utilisateur par email avec un
              préavis de 30 jours. À défaut d&apos;opposition manifestée par la résiliation du compte avant
              l&apos;entrée en vigueur, l&apos;Utilisateur sera réputé avoir accepté les nouvelles CGU.
            </p>
          </section>

          <section id="manquement">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              16. Résiliation par Quotely en cas de manquement
            </h2>
            <p>
              {LEGAL_INFO.nomCommercial} peut suspendre ou résilier le Compte en cas de manquement grave aux
              présentes CGU (utilisation frauduleuse, spam, atteinte aux droits de tiers, défaut de paiement)
              après une mise en demeure restée infructueuse pendant 7 jours. En cas de manquement particulièrement
              grave, la suspension peut intervenir sans préavis.
            </p>
          </section>

          <section id="droit">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              17. Droit applicable et juridiction compétente
            </h2>
            <p>
              Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou
              à leur exécution sera, à défaut de résolution amiable, soumis à la compétence exclusive des
              tribunaux français.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            ← Retour à l&apos;accueil
          </Link>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/mentions-legales" className="text-[var(--primary)] hover:underline">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="text-[var(--primary)] hover:underline">Confidentialité</Link>
            <Link href="/cookies" className="text-[var(--primary)] hover:underline">Cookies</Link>
            <Link href="/rgpd" className="text-[var(--primary)] hover:underline">RGPD</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
