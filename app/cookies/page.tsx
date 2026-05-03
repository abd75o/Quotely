import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { LEGAL_INFO } from "@/lib/legal-info";

export const metadata: Metadata = {
  title: "Politique cookies — Quotely",
  description:
    "Liste des cookies utilisés par Quotely, leur finalité, leur durée de conservation et comment gérer votre consentement.",
  robots: { index: true, follow: true },
};

interface CookieRow {
  name: string;
  finalite: string;
  duree: string;
  type: "Essentiel" | "Analytique" | "Marketing";
}

const COOKIES: CookieRow[] = [
  {
    name: "sb-{project}-auth-token",
    finalite: "Authentification de l'utilisateur connecté (token Supabase Auth)",
    duree: "Session",
    type: "Essentiel",
  },
  {
    name: "sb-{project}-auth-token-code-verifier",
    finalite: "Sécurisation du flux d'authentification OAuth (PKCE)",
    duree: "Session",
    type: "Essentiel",
  },
  {
    name: "quotely-cookie-consent",
    finalite: "Mémorisation de votre choix de consentement aux cookies",
    duree: "6 mois",
    type: "Essentiel",
  },
  {
    name: "onboarded",
    finalite: "Évite la redirection vers l'onboarding pour un utilisateur déjà passé par cette étape",
    duree: "1 an",
    type: "Essentiel",
  },
];

const TYPE_BADGE: Record<CookieRow["type"], string> = {
  Essentiel: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Analytique: "bg-blue-50 text-blue-700 border-blue-200",
  Marketing: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
          Politique cookies
        </h1>
        <div className="inline-block px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] mb-10">
          <p className="text-xs text-[var(--text-secondary)]">
            Dernière mise à jour : <span className="font-semibold">{LEGAL_INFO.dateDerniereMaj}</span>
          </p>
        </div>

        <div className="space-y-12 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              Qu&apos;est-ce qu&apos;un cookie&nbsp;?
            </h2>
            <p className="mb-3">
              Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, mobile) lors
              de la visite d&apos;un site web. Il permet au site de vous reconnaître lors de visites ultérieures
              ou de mémoriser vos préférences pendant la session en cours.
            </p>
            <p>
              {LEGAL_INFO.nomCommercial} utilise uniquement des cookies <strong className="text-[var(--text-primary)]">strictement
              nécessaires</strong> au fonctionnement du Service. Aucun cookie publicitaire ou de tracking tiers
              n&apos;est déposé sans votre consentement.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              Cookies utilisés
            </h2>

            {/* Tableau desktop */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    <th className="text-left font-semibold text-[var(--text-primary)] px-4 py-2.5">Nom</th>
                    <th className="text-left font-semibold text-[var(--text-primary)] px-4 py-2.5">Finalité</th>
                    <th className="text-left font-semibold text-[var(--text-primary)] px-4 py-2.5">Durée</th>
                    <th className="text-left font-semibold text-[var(--text-primary)] px-4 py-2.5">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {COOKIES.map((c) => (
                    <tr key={c.name}>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">{c.name}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{c.finalite}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{c.duree}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_BADGE[c.type]}`}
                        >
                          {c.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <ul className="md:hidden space-y-3">
              {COOKIES.map((c) => (
                <li key={c.name} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-mono text-xs text-[var(--text-primary)] break-all">{c.name}</p>
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${TYPE_BADGE[c.type]}`}
                    >
                      {c.type}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-1">{c.finalite}</p>
                  <p className="text-xs text-[var(--text-muted)]">Durée&nbsp;: {c.duree}</p>
                </li>
              ))}
            </ul>

            <p className="text-xs text-[var(--text-muted)] italic mt-4">
              Note&nbsp;: des cookies analytiques (mesure d&apos;audience anonymisée) pourront être ajoutés
              ultérieurement. Ils ne seront déposés qu&apos;après recueil de votre consentement explicite via
              la bannière de cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              Gérer votre consentement
            </h2>
            <p className="mb-3">
              Vous pouvez gérer votre consentement aux cookies de deux manières&nbsp;:
            </p>
            <ul className="space-y-2 pl-5 list-disc marker:text-[var(--text-muted)] mb-6">
              <li>
                <strong className="text-[var(--text-primary)]">Via la bannière de cookies</strong> qui apparaît
                lors de votre première visite ou lorsque vous cliquez sur le bouton ci-dessous.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Via les paramètres de votre navigateur</strong>{" "}
                (Chrome, Firefox, Safari, Edge…) qui vous permettent de bloquer ou supprimer les cookies. Cette
                option peut toutefois empêcher le bon fonctionnement du Service (impossibilité de rester connecté
                par exemple).
              </li>
            </ul>

            <button
              type="button"
              disabled
              title="Bannière de gestion du consentement — disponible dans une prochaine version"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl cursor-not-allowed opacity-70"
            >
              Modifier mes préférences cookies
            </button>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              La bannière de gestion sera disponible prochainement.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              En savoir plus
            </h2>
            <p>
              Pour plus d&apos;informations sur l&apos;ensemble du traitement de vos données, consultez notre{" "}
              <Link href="/politique-confidentialite" className="text-[var(--primary)] hover:underline">
                politique de confidentialité
              </Link>
              . La CNIL met également à disposition un{" "}
              <a
                href="https://www.cnil.fr/fr/cookies-et-traceurs-que-dit-la-loi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                guide complet sur les cookies
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
            <Link href="/mentions-legales" className="text-[var(--primary)] hover:underline">Mentions légales</Link>
            <Link href="/cgu" className="text-[var(--primary)] hover:underline">CGU</Link>
            <Link href="/politique-confidentialite" className="text-[var(--primary)] hover:underline">Confidentialité</Link>
            <Link href="/rgpd" className="text-[var(--primary)] hover:underline">RGPD</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
