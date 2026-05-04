import type { Metadata } from "next";
import Link from "next/link";
import {
  Eye,
  Edit3,
  Trash2,
  Download,
  Ban,
  PauseCircle,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { LEGAL_INFO } from "@/lib/legal-info";

export const metadata: Metadata = {
  title: "Vos droits RGPD — Quovi",
  description:
    "Synthèse de vos droits RGPD chez Quovi : accès, rectification, effacement, portabilité, opposition, limitation. Comment les exercer en 1 email.",
  robots: { index: true, follow: true },
};

const RIGHTS = [
  {
    icon: Eye,
    title: "Droit d'accès",
    desc: "Vous avez le droit d'obtenir la confirmation que des données vous concernant sont traitées, et d'en recevoir une copie.",
  },
  {
    icon: Edit3,
    title: "Droit de rectification",
    desc: "Vous pouvez demander à tout moment la correction de données inexactes ou incomplètes vous concernant.",
  },
  {
    icon: Trash2,
    title: "Droit à l'effacement",
    desc: "Aussi appelé « droit à l'oubli », il vous permet de demander la suppression de vos données dans certaines conditions (compte clôturé, retrait du consentement, traitement non nécessaire).",
  },
  {
    icon: Download,
    title: "Droit à la portabilité",
    desc: "Vous pouvez récupérer vos données dans un format structuré et lisible (JSON, CSV) pour les transférer vers un autre service.",
  },
  {
    icon: Ban,
    title: "Droit d'opposition",
    desc: "Vous pouvez vous opposer à tout moment au traitement de vos données pour des motifs légitimes, notamment à des fins de prospection commerciale.",
  },
  {
    icon: PauseCircle,
    title: "Droit à la limitation",
    desc: "Vous pouvez demander la suspension temporaire du traitement de vos données, par exemple le temps de vérifier l'exactitude d'une information contestée.",
  },
];

export default function RGPDPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
          Vos droits RGPD
        </h1>
        <div className="inline-block px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] mb-10">
          <p className="text-xs text-[var(--text-secondary)]">
            Dernière mise à jour : <span className="font-semibold">{LEGAL_INFO.dateDerniereMaj}</span>
          </p>
        </div>

        <div className="space-y-12 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              Vos données vous appartiennent
            </h2>
            <p className="mb-3">
              Chez {LEGAL_INFO.nomCommercial}, vos devis, fiches clients, signatures et informations
              d&apos;entreprise sont <strong className="text-[var(--text-primary)]">votre propriété</strong>.
              Nous nous contentons de les héberger pour vous permettre d&apos;utiliser le Service.
            </p>
            <p>
              Le RGPD vous garantit six droits fondamentaux sur vos données personnelles. Voici comment les
              exercer simplement chez {LEGAL_INFO.nomCommercial}.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-6">
              Les 6 droits que vous pouvez exercer
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {RIGHTS.map(({ icon: Icon, title, desc }) => (
                <li
                  key={title}
                  className="p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-bg)] flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">{title}</h3>
                  <p className="text-sm leading-relaxed">{desc}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              Comment exercer vos droits
            </h2>
            <p className="mb-4">
              Pour exercer l&apos;un de ces droits, il suffit d&apos;envoyer un email à&nbsp;:
            </p>
            <a
              href={`mailto:${LEGAL_INFO.emailContact}?subject=Demande RGPD`}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm mb-4"
            >
              {LEGAL_INFO.emailContact}
            </a>
            <p className="mb-3">
              Indiquez dans votre demande&nbsp;: le droit que vous souhaitez exercer, l&apos;adresse email du
              compte concerné, et toute information utile pour traiter votre requête.
            </p>
            <p className="text-sm italic">
              Un formulaire dédié sera mis à disposition prochainement depuis votre espace «&nbsp;Paramètres&nbsp;»
              pour faciliter ces démarches.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              Délai de réponse
            </h2>
            <p>
              Nous nous engageons à vous répondre dans un délai maximum de{" "}
              <strong className="text-[var(--text-primary)]">1 mois</strong> à compter de la réception de votre
              demande. Ce délai peut être prolongé de 2 mois dans les cas de demandes particulièrement complexes
              ou nombreuses, conformément à l&apos;article 12.3 du RGPD&nbsp;; nous vous en informerons alors par
              email.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
              Recours auprès de la CNIL
            </h2>
            <p className="mb-3">
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez
              introduire une réclamation auprès de l&apos;autorité de contrôle française&nbsp;:
            </p>
            <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl mb-3">
              <p className="font-semibold text-[var(--text-primary)] mb-1">
                Commission Nationale de l&apos;Informatique et des Libertés (CNIL)
              </p>
              <p className="text-sm">3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</p>
              <p className="text-sm">Téléphone&nbsp;: 01 53 73 22 22</p>
            </div>
            <p>
              Vous pouvez déposer votre plainte directement en ligne sur le site de la CNIL&nbsp;:{" "}
              <a
                href="https://www.cnil.fr/fr/plaintes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                www.cnil.fr/fr/plaintes
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
            <Link href="/cookies" className="text-[var(--primary)] hover:underline">Cookies</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
