import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Highlight } from "@/components/ui/Highlight";
import { Logo } from "@/components/shared/Logo";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-white via-white to-[var(--primary-bg)] pt-28 pb-12 md:pt-36 md:pb-20">
      {/* Subtle warm overlay — empile un 2ème dégradé pour la profondeur */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-tl from-[var(--accent-warm-bg)] via-transparent to-transparent pointer-events-none -z-10"
      />
      {/* Decorative blobs — opacity bridée à 30 sur mobile pour ne pas écraser le texte */}
      <div
        aria-hidden
        className="hidden md:block absolute top-0 right-0 w-[600px] h-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-[var(--primary)] opacity-30 xl:opacity-50 blur-3xl pointer-events-none -z-10"
      />
      <div
        aria-hidden
        className="hidden md:block absolute bottom-0 left-0 w-[500px] h-[500px] -translate-x-1/4 translate-y-1/4 rounded-3xl bg-[var(--accent-warm)] opacity-30 xl:opacity-50 blur-3xl pointer-events-none -z-10"
      />
      <div
        aria-hidden
        className="hidden lg:block absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#8B5CF6] opacity-20 xl:opacity-30 blur-3xl pointer-events-none -z-10"
      />

      <div className="relative max-w-[1600px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div className="lg:col-span-7 animate-fade-in-up">
            <h1 className="font-display text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-tight text-[var(--text-primary)]">
              Pendant que vous écrivez,{" "}
              <Highlight variant="primary">ils signent ailleurs</Highlight>.
            </h1>

            <p className="mt-6 text-lg md:text-xl leading-relaxed text-[var(--text-secondary)] max-w-xl">
              Quotely, le devis qui part avant que vous passiez à autre chose.
              Le client signe sur place, sur son téléphone.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <Button href="/inscription" variant="primary" icon>
                Sécuriser mon activité
              </Button>
              <Button href="#comment-ca-marche" variant="secondary">
                Voir comment ça marche
              </Button>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end animate-fade-in-up">
            <div className="animate-float">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[400px] xl:max-w-[460px]">
      <div className="bg-[var(--text-primary)] rounded-[2.5rem] p-2.5 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.25)]">
        <div className="bg-[var(--bg-secondary)] rounded-[2rem] overflow-hidden">
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--emerald-bg)] text-[10px] font-semibold text-[var(--emerald-dark)]">
                  <CheckCircle2 className="w-3 h-3" />
                  Signé
                </span>
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Restaurant Le Provençal
              </p>
            </div>
            <div className="p-4 space-y-2">
              <Row label="Carrelage cuisine 40 m²" price="2 400 €" />
              <Row label="Réfection sol" price="1 800 €" />
              <Row label="Main d’œuvre" price="960 €" />
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

function Row({ label, price }: { label: string; price: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="text-[var(--text-primary)] font-medium">{price}</span>
    </div>
  );
}
