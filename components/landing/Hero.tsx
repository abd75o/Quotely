import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

export function Hero() {
  return (
    <section className="relative bg-[var(--background)] overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pt-32 lg:pb-32">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div className="lg:col-span-7 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)]">
              Pendant que vous écrivez,{" "}
              <span className="text-[var(--primary)]">il signe ailleurs.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl leading-relaxed text-[var(--text-secondary)] max-w-xl">
              Quotely, le devis qui part avant que vous quittiez le chantier.
              Le client signe sur place, sur son téléphone.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <Link
                href="/inscription"
                className="group inline-flex items-center justify-center gap-2 px-6 py-4 min-h-[52px] text-base font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl shadow-md hover:shadow-lg transition-colors duration-200 cursor-pointer"
              >
                Sécuriser mes chantiers
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <Link
                href="#comment-ca-marche"
                className="inline-flex items-center justify-center px-2 py-3 min-h-[44px] text-base font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4 decoration-gray-300 hover:decoration-gray-500 transition-colors duration-200 cursor-pointer"
              >
                Voir comment ça marche
              </Link>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end animate-fade-in-up">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[300px] sm:max-w-[340px]">
      <div className="relative bg-[var(--text-primary)] rounded-[2.5rem] p-2.5 shadow-xl">
        <div className="bg-[var(--surface)] rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[11px] font-semibold text-[var(--text-primary)]">
            <span>14:32</span>
            <span>100%</span>
          </div>

          {/* Notification */}
          <div className="mx-3 mt-2 mb-3 p-3 bg-white rounded-2xl shadow-sm border border-[var(--border-light)]">
            <div className="flex items-start gap-2.5">
              <Logo variant="icon" size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                    Quotely
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">maintenant</p>
                </div>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5 truncate">
                  Devis #042 — Restaurant Le Provençal
                </p>
                <p className="text-xs text-[var(--emerald-dark)] font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Signé · 14:32
                </p>
              </div>
            </div>
          </div>

          {/* Quote card */}
          <div className="mx-3 mb-4 bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[var(--border-light)]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Devis #042
                </p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-[var(--emerald-dark)]">
                  <CheckCircle2 className="w-3 h-3" />
                  Signé
                </span>
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Restaurant Le Provençal
              </p>
            </div>

            <div className="p-4 space-y-2">
              <QuoteRow label="Carrelage cuisine 40m²" price="2 400 €" />
              <QuoteRow label="Réfection sol" price="1 800 €" />
              <QuoteRow label="Main d'œuvre" price="960 €" />
              <div className="pt-2 mt-1 border-t border-[var(--border-light)] flex justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Total TTC
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)]">5 160 €</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteRow({ label, price }: { label: string; price: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="text-[var(--text-primary)] font-medium">{price}</span>
    </div>
  );
}
