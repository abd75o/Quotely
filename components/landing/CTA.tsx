import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const REASSURANCES = [
  "14 jours offerts",
  "Sans carte bancaire",
  "Résiliable en un clic",
];

export function CTA() {
  return (
    <section className="py-24 bg-[var(--surface)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight leading-[1.15]">
          Votre prochain devis pourrait être signé{" "}
          <span className="text-[var(--primary)]">ce soir.</span>
        </h2>

        <p className="mt-6 text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto">
          Créez votre compte. Testez sur un vrai chantier. Décidez ensuite.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/inscription"
            className="group inline-flex items-center justify-center gap-2 px-6 py-4 min-h-[52px] text-base font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl shadow-md hover:shadow-lg transition-colors duration-200 cursor-pointer"
          >
            Commencer maintenant
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/tarifs"
            className="inline-flex items-center justify-center gap-2 px-6 py-4 min-h-[52px] text-base font-semibold text-[var(--text-primary)] bg-white hover:bg-gray-50 border border-[var(--border)] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            Voir les tarifs
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3">
          {REASSURANCES.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--emerald-dark)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {item}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-[var(--text-muted)]">
          Données hébergées en France · RGPD · Paiement sécurisé par Stripe
        </p>
      </div>
    </section>
  );
}
