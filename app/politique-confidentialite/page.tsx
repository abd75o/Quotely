import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { LEGAL_INFO } from "@/lib/legal-info";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Quotely",
  description:
    "Politique de confidentialité de Quotely : données collectées, finalités, durées de conservation, sous-traitants RGPD et droits des utilisateurs.",
  robots: { index: true, follow: true },
};

const SECTIONS = [
  { id: "preambule", label: "1. Préambule" },
  { id: "responsable", label: "2. Responsable de traitement" },
  { id: "donnees", label: "3. Données collectées" },
  { id: "finalites", label: "4. Finalités et bases légales" },
  { id: "conservation", label: "5. Durées de conservation" },
  { id: "sous-traitants", label: "6. Sous-traitants" },
  { id: "transferts", label: "7. Transferts hors UE" },
  { id: "ia", label: "8. Intelligence artificielle" },
  { id: "droits", label: "9. Vos droits RGPD" },
  { id: "exercer", label: "10. Exercer vos droits" },
  { id: "cnil", label: "11. Réclamation CNIL" },
  { id: "cookies", label: "12. Cookies" },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
          Politique de confidentialité
        </h1>
        <div className="inline-block px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] mb-10">
          <p className="text-xs text-[var(--text-secondary)]">
            Dernière mise à jour : <span className="font-semibold">{LEGAL_INFO.dateDerniereMaj}</span>
          </p>
        </div>

        <nav aria-label="Sommaire" className="mb-12 p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Sommaire</p>
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
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">1. Préambule</h2>
            <p className="mb-3">
              {LEGAL_INFO.nomCommercial} accorde une attention particulière à la protection de la vie privée et
              des données personnelles de ses utilisateurs. La présente politique a pour objet de vous informer,
              en toute transparence, des données que nous collectons, de la manière dont nous les utilisons et
              de vos droits.
            </p>
            <p>
              Cette politique est conforme au Règlement Général sur la Protection des Données (UE&nbsp;2016/679,
              ci-après «&nbsp;RGPD&nbsp;») et à la loi française «&nbsp;Informatique et Libertés&nbsp;» modifiée.
            </p>
          </section>

          <section id="responsable">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              2. Responsable de traitement
            </h2>
            <p className="mb-3">Le responsable de traitement des données personnelles est&nbsp;:</p>
            <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl">
              <p className="font-semibold text-[var(--text-primary)]">{LEGAL_INFO.raisonSociale}</p>
              <p className="text-sm">{LEGAL_INFO.adresse}, {LEGAL_INFO.codePostal} {LEGAL_INFO.ville}</p>
              <p className="text-sm">SIRET&nbsp;: {LEGAL_INFO.siret}</p>
              <p className="text-sm mt-2">
                Contact&nbsp;:{" "}
                <a href={`mailto:${LEGAL_INFO.emailContact}`} className="text-[var(--primary)] hover:underline">
                  {LEGAL_INFO.emailContact}
                </a>
              </p>
              <p className="text-sm mt-2">
                <span className="font-semibold text-[var(--text-primary)]">DPO&nbsp;:</span> {LEGAL_INFO.dpo}
              </p>
            </div>
          </section>

          <section id="donnees">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              3. Données collectées
            </h2>
            <p className="mb-4">
              Nous collectons uniquement les données strictement nécessaires au fonctionnement du Service&nbsp;:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">À l&apos;inscription</h3>
                <ul className="space-y-1 pl-5 list-disc marker:text-[var(--text-muted)]">
                  <li>Adresse email</li>
                  <li>Mot de passe (haché via bcrypt côté Supabase Auth, jamais stocké en clair)</li>
                  <li>Nom</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">Lors de l&apos;onboarding</h3>
                <ul className="space-y-1 pl-5 list-disc marker:text-[var(--text-muted)]">
                  <li>Métier / activité</li>
                  <li>Nom de l&apos;entreprise</li>
                  <li>Téléphone</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">Profil entreprise (facultatif)</h3>
                <ul className="space-y-1 pl-5 list-disc marker:text-[var(--text-muted)]">
                  <li>Raison sociale, SIRET, adresse complète</li>
                  <li>Statut TVA, numéro TVA intracommunautaire</li>
                  <li>IBAN et BIC (utilisés uniquement pour figurer sur les devis et factures)</li>
                  <li>Logo de l&apos;entreprise</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">Données d&apos;usage du Service</h3>
                <ul className="space-y-1 pl-5 list-disc marker:text-[var(--text-muted)]">
                  <li>Devis créés (contenu, statut, signature)</li>
                  <li>Fiches clients ajoutées</li>
                  <li>Signatures électroniques recueillies</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">Données techniques</h3>
                <ul className="space-y-1 pl-5 list-disc marker:text-[var(--text-muted)]">
                  <li>Adresse IP</li>
                  <li>User-agent (navigateur, système d&apos;exploitation)</li>
                  <li>Logs d&apos;accès (date, action, ressource)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">Données de paiement</h3>
                <p>
                  {LEGAL_INFO.nomCommercial} ne stocke <span className="font-semibold text-[var(--text-primary)]">aucune
                  donnée de carte bancaire</span>. Toutes les transactions sont gérées par Stripe Payments
                  Europe Ltd, certifié PCI-DSS niveau 1.
                </p>
              </div>
            </div>
          </section>

          <section id="finalites">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              4. Finalités et bases légales
            </h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    <th className="text-left font-semibold text-[var(--text-primary)] px-4 py-2.5">Finalité</th>
                    <th className="text-left font-semibold text-[var(--text-primary)] px-4 py-2.5">Base légale (RGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  <tr>
                    <td className="px-4 py-2.5">Fourniture et exécution du Service</td>
                    <td className="px-4 py-2.5">Exécution du contrat (art. 6.1.b)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Facturation et comptabilité</td>
                    <td className="px-4 py-2.5">Obligation légale (art. 6.1.c)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Newsletter et communications marketing</td>
                    <td className="px-4 py-2.5">Consentement (art. 6.1.a)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Sécurité, prévention de la fraude, logs techniques</td>
                    <td className="px-4 py-2.5">Intérêt légitime (art. 6.1.f)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="conservation">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              5. Durées de conservation
            </h2>
            <ul className="space-y-2 pl-5 list-disc marker:text-[var(--text-muted)]">
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Compte actif&nbsp;:</span> pendant
                toute la durée de l&apos;abonnement, puis 3 ans après la dernière activité (relation client).
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Factures et données comptables&nbsp;:</span>{" "}
                10 ans à compter de leur émission, en application de l&apos;article L123-22 du Code de commerce.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Logs techniques&nbsp;:</span> 12 mois
                maximum (recommandation CNIL).
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Données du compte supprimé&nbsp;:</span>{" "}
                anonymisation ou suppression sous 30 jours, hors obligations légales de conservation.
              </li>
            </ul>
          </section>

          <section id="sous-traitants">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              6. Sous-traitants
            </h2>
            <p className="mb-4">
              {LEGAL_INFO.nomCommercial} fait appel aux sous-traitants suivants, choisis pour leurs garanties
              de sécurité et de conformité RGPD&nbsp;:
            </p>
            <div className="space-y-3">
              <SubProcessor
                name={LEGAL_INFO.hebergeurFront.nom}
                role="Hébergement de l'application web"
                country={LEGAL_INFO.hebergeurFront.pays}
                url={LEGAL_INFO.hebergeurFront.politiqueUrl}
              />
              <SubProcessor
                name={LEGAL_INFO.hebergeurBackend.nom}
                role="Base de données, authentification, stockage des fichiers"
                country={LEGAL_INFO.hebergeurBackend.pays}
                url={LEGAL_INFO.hebergeurBackend.politiqueUrl}
              />
              <SubProcessor
                name={LEGAL_INFO.paiement.nom}
                role="Traitement des paiements et abonnements"
                country={LEGAL_INFO.paiement.pays}
                url={LEGAL_INFO.paiement.politiqueUrl}
              />
              <SubProcessor
                name={LEGAL_INFO.ia.nom}
                role="Modèles d'intelligence artificielle (dictée vocale, rédaction guidée)"
                country={LEGAL_INFO.ia.pays}
                url={LEGAL_INFO.ia.politiqueUrl}
              />
            </div>
          </section>

          <section id="transferts">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              7. Transferts hors Union européenne
            </h2>
            <p className="mb-3">
              Certains de nos sous-traitants sont établis en dehors de l&apos;Union européenne&nbsp;:
              <strong className="text-[var(--text-primary)]"> Netlify</strong> et{" "}
              <strong className="text-[var(--text-primary)]">Anthropic</strong> sont basés aux États-Unis.
            </p>
            <p>
              Ces transferts sont encadrés par le{" "}
              <span className="font-semibold text-[var(--text-primary)]">Data Privacy Framework (DPF)</span>,
              décision d&apos;adéquation de la Commission européenne du 10 juillet 2023, qui garantit un niveau
              de protection des données équivalent à celui prévu par le RGPD.
            </p>
          </section>

          <section id="ia">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              8. Intelligence artificielle
            </h2>
            <p className="mb-3">
              {LEGAL_INFO.nomCommercial} utilise les modèles de langage <strong className="text-[var(--text-primary)]">Claude</strong>{" "}
              édités par Anthropic uniquement <strong className="text-[var(--text-primary)]">à votre demande</strong>,
              pour les fonctionnalités suivantes&nbsp;: dictée vocale, rédaction guidée des prestations et
              suggestions tarifaires.
            </p>
            <p className="mb-3">
              <strong className="text-[var(--text-primary)]">{LEGAL_INFO.ia.engagement}</strong>{" "}
              Vos contenus restent confidentiels et ne contribuent pas à l&apos;amélioration des modèles
              Anthropic.
            </p>
            <p>
              Les requêtes sont chiffrées en transit (TLS 1.2+) et traitées dans la session active uniquement.
              Aucune donnée n&apos;est conservée chez Anthropic au-delà de la fenêtre nécessaire au traitement
              de la requête.
            </p>
          </section>

          <section id="droits">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              9. Vos droits RGPD
            </h2>
            <p className="mb-3">Conformément au RGPD, vous disposez des droits suivants&nbsp;:</p>
            <ul className="space-y-2 pl-5 list-disc marker:text-[var(--text-muted)]">
              <li><span className="font-semibold text-[var(--text-primary)]">Droit d&apos;accès</span> aux données vous concernant&nbsp;;</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Droit de rectification</span> des données inexactes&nbsp;;</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Droit à l&apos;effacement</span> («&nbsp;droit à l&apos;oubli&nbsp;»)&nbsp;;</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Droit à la portabilité</span> de vos données dans un format structuré&nbsp;;</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Droit d&apos;opposition</span> au traitement&nbsp;;</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Droit à la limitation</span> du traitement&nbsp;;</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Droit de retirer votre consentement</span> à tout moment, sans remettre en cause la licéité des traitements antérieurs.</li>
            </ul>
          </section>

          <section id="exercer">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              10. Exercer vos droits
            </h2>
            <p className="mb-3">
              Pour exercer ces droits, adressez votre demande à{" "}
              <a href={`mailto:${LEGAL_INFO.emailContact}`} className="text-[var(--primary)] hover:underline">
                {LEGAL_INFO.emailContact}
              </a>{" "}
              en précisant votre identité et l&apos;objet de votre demande.
            </p>
            <p>
              Nous nous engageons à vous répondre dans un délai maximum de{" "}
              <span className="font-semibold text-[var(--text-primary)]">1 mois</span> à compter de la réception
              de votre demande.
            </p>
          </section>

          <section id="cnil">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              11. Réclamation auprès de la CNIL
            </h2>
            <p className="mb-3">
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez
              adresser une réclamation à la Commission Nationale de l&apos;Informatique et des Libertés (CNIL)&nbsp;:
            </p>
            <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl">
              <p className="text-sm">CNIL — 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</p>
              <p className="text-sm">Téléphone&nbsp;: 01 53 73 22 22</p>
              <p className="text-sm">
                Site&nbsp;:{" "}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline"
                >
                  www.cnil.fr
                </a>
              </p>
            </div>
          </section>

          <section id="cookies">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              12. Cookies
            </h2>
            <p>
              L&apos;usage de cookies est détaillé dans notre{" "}
              <Link href="/cookies" className="text-[var(--primary)] hover:underline">
                politique cookies
              </Link>
              . Quotely n&apos;utilise que des cookies strictement nécessaires au fonctionnement du Service.
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
            <Link href="/cgu" className="text-[var(--primary)] hover:underline">CGU</Link>
            <Link href="/cookies" className="text-[var(--primary)] hover:underline">Cookies</Link>
            <Link href="/rgpd" className="text-[var(--primary)] hover:underline">RGPD</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SubProcessor({
  name,
  role,
  country,
  url,
}: {
  name: string;
  role: string;
  country: string;
  url: string;
}) {
  return (
    <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl">
      <p className="font-semibold text-[var(--text-primary)]">{name}</p>
      <p className="text-sm">{role}</p>
      <p className="text-sm text-[var(--text-muted)]">Localisation&nbsp;: {country}</p>
      <p className="text-sm mt-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] hover:underline"
        >
          Politique de confidentialité du sous-traitant ↗
        </a>
      </p>
    </div>
  );
}
