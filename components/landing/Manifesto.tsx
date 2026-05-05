import { Section } from "@/components/ui/Section";
import { Highlight } from "@/components/ui/Highlight";
import { Reveal } from "@/components/ui/Reveal";

export function Manifesto() {
  return (
    <Section
      variant="alt"
      id="manifeste"
      className="py-16 sm:py-24 lg:py-32 bg-gradient-to-br from-[#FAFBFF] via-white to-[#FEF9F0]"
    >
      <Reveal className="max-w-[800px] mx-auto text-center">
        <p className="text-sm uppercase tracking-wider font-semibold text-[var(--text-muted)]">
          Le manifeste
        </p>

        <h2 className="mt-6 font-display text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-[var(--text-primary)]">
          Chaque devis pas envoyé est un chantier{" "}
          <Highlight variant="warm">
            <span className="text-[var(--primary)]">perdu</span>
          </Highlight>
          .
        </h2>

        <div className="mt-10 max-w-[600px] mx-auto space-y-6">
          <p className="text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
            Vos clients ne vous attendent pas. Pendant que vous rédigez le
            devis le soir à 22 h, ils en ont déjà reçu deux autres. Et signé
            chez le premier qui a répondu.
          </p>

          <p className="text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
            Quovi est né de ce constat simple : un artisan qui réagit en 10
            minutes signe 3 fois plus qu’un artisan qui répond le lendemain.
            Pas grâce à des prix plus bas. Juste grâce à la rapidité.
          </p>

          <div>
            <p className="text-lg sm:text-xl leading-relaxed italic font-medium text-[var(--text-primary)]">
              Vous parlez. Le devis part. Votre client signe.
            </p>
            <p className="mt-2 text-lg sm:text-xl leading-relaxed italic font-bold text-[var(--text-primary)]">
              Avant qu’il ait le temps de douter.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center">
          <div className="w-[60px] border-t border-[var(--border)] opacity-[0.15]" />
          <a
            href="/#features"
            aria-label="En savoir plus pour les freelances et autres professionnels"
            className="mt-8 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors duration-200"
          >
            ↳ Freelance, consultant, commerçant ? Quovi marche aussi pour vous →
          </a>
        </div>
      </Reveal>
    </Section>
  );
}
