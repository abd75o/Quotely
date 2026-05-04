import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { LEGAL_INFO } from "@/lib/legal-info";

export const metadata: Metadata = {
  title: "Mentions légales — Quovi",
  description:
    "Mentions légales de Quovi : éditeur du site, hébergement, propriété intellectuelle et responsabilité.",
  robots: { index: true, follow: true },
};

const SECTIONS = [
  { id: "editeur", label: "Éditeur du site" },
  { id: "hebergement", label: "Hébergement" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "droit", label: "Droit applicable" },
];

export default function MentionsLegalesPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
          Mentions légales
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
          <ul className="space-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-[var(--primary)] hover:underline cursor-pointer"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12 text-[var(--text-secondary)] leading-relaxed">
          <section id="editeur">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              1. Éditeur du site
            </h2>
            <p className="mb-3">
              Le site <span className="font-semibold text-[var(--text-primary)]">{LEGAL_INFO.domaine}</span>{" "}
              (ci-après «&nbsp;le Site&nbsp;») est édité par&nbsp;:
            </p>
            <ul className="space-y-1.5 pl-5 list-disc marker:text-[var(--text-muted)]">
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Raison sociale&nbsp;:</span>{" "}
                {LEGAL_INFO.raisonSociale}
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Forme juridique&nbsp;:</span>{" "}
                {LEGAL_INFO.formeJuridique}
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Capital social&nbsp;:</span>{" "}
                {LEGAL_INFO.capital}
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Siège social&nbsp;:</span>{" "}
                {LEGAL_INFO.adresse}, {LEGAL_INFO.codePostal} {LEGAL_INFO.ville}, {LEGAL_INFO.pays}
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">SIRET&nbsp;:</span> {LEGAL_INFO.siret}
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">RCS&nbsp;:</span> {LEGAL_INFO.rcs}
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">N° TVA intracommunautaire&nbsp;:</span>{" "}
                {LEGAL_INFO.numeroTvaIntra}
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Email&nbsp;:</span>{" "}
                <a
                  href={`mailto:${LEGAL_INFO.emailContact}`}
                  className="text-[var(--primary)] hover:underline"
                >
                  {LEGAL_INFO.emailContact}
                </a>
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Directeur de la publication&nbsp;:</span>{" "}
                {LEGAL_INFO.directeurPublication}
              </li>
            </ul>
          </section>

          <section id="hebergement">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              2. Hébergement
            </h2>
            <p className="mb-3">
              Le Site est hébergé par les prestataires suivants&nbsp;:
            </p>

            <div className="space-y-5">
              <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl">
                <p className="font-semibold text-[var(--text-primary)] mb-1">
                  Hébergeur de l&apos;application web — {LEGAL_INFO.hebergeurFront.nom}
                </p>
                <p className="text-sm">{LEGAL_INFO.hebergeurFront.adresse}</p>
                <p className="text-sm">Pays&nbsp;: {LEGAL_INFO.hebergeurFront.pays}</p>
                <p className="text-sm mt-2">
                  Politique de confidentialité&nbsp;:{" "}
                  <a
                    href={LEGAL_INFO.hebergeurFront.politiqueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    {LEGAL_INFO.hebergeurFront.politiqueUrl}
                  </a>
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl">
                <p className="font-semibold text-[var(--text-primary)] mb-1">
                  Base de données &amp; authentification — {LEGAL_INFO.hebergeurBackend.nom}
                </p>
                <p className="text-sm">{LEGAL_INFO.hebergeurBackend.adresse}</p>
                <p className="text-sm">Pays&nbsp;: {LEGAL_INFO.hebergeurBackend.pays}</p>
                <p className="text-sm mt-2">
                  Politique de confidentialité&nbsp;:{" "}
                  <a
                    href={LEGAL_INFO.hebergeurBackend.politiqueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    {LEGAL_INFO.hebergeurBackend.politiqueUrl}
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section id="propriete">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              3. Propriété intellectuelle
            </h2>
            <p className="mb-3">
              La marque <span className="font-semibold text-[var(--text-primary)]">{LEGAL_INFO.nomCommercial}</span>,
              le logo, la charte graphique, les contenus textuels, illustrations, images et code source
              du Site sont la propriété exclusive de {LEGAL_INFO.raisonSociale} et sont protégés par le droit
              français et international de la propriété intellectuelle.
            </p>
            <p className="mb-3">
              Toute reproduction, représentation, modification, publication, transmission, dénaturation,
              totale ou partielle du Site ou de son contenu, par quelque procédé que ce soit, et sur
              quelque support que ce soit, est strictement interdite sans l&apos;autorisation écrite préalable
              de l&apos;éditeur.
            </p>
            <p>
              Les contenus saisis par les utilisateurs (devis, fiches clients, logos d&apos;entreprise,
              documents) restent l&apos;entière propriété de leurs auteurs. {LEGAL_INFO.nomCommercial} ne
              dispose d&apos;aucun droit de propriété sur ces données.
            </p>
          </section>

          <section id="responsabilite">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              4. Limitation de responsabilité
            </h2>
            <p className="mb-3">
              {LEGAL_INFO.nomCommercial} met tout en œuvre pour assurer l&apos;exactitude et la mise à jour
              des informations diffusées sur le Site, mais ne saurait garantir l&apos;exhaustivité ou
              l&apos;absence d&apos;erreurs.
            </p>
            <p className="mb-3">
              L&apos;éditeur ne pourra être tenu responsable des dommages directs ou indirects résultant
              de l&apos;accès ou de l&apos;utilisation du Site, y compris l&apos;inaccessibilité, la perte de
              données ou la présence de virus.
            </p>
            <p>
              Les liens hypertextes vers des sites tiers sont fournis à titre informatif. {LEGAL_INFO.nomCommercial}
              n&apos;exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur
              contenu.
            </p>
          </section>

          <section id="droit">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              5. Droit applicable et juridiction compétente
            </h2>
            <p className="mb-3">
              Les présentes mentions légales sont soumises au droit français.
            </p>
            <p>
              En cas de litige, et à défaut de résolution amiable, les tribunaux français seront seuls
              compétents. Pour toute question, contactez-nous à&nbsp;:{" "}
              <a
                href={`mailto:${LEGAL_INFO.emailContact}`}
                className="text-[var(--primary)] hover:underline"
              >
                {LEGAL_INFO.emailContact}
              </a>
              .
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
            <Link href="/cgu" className="text-[var(--primary)] hover:underline">CGU</Link>
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
