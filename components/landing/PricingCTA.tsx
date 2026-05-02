import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function PricingCTA() {
  return (
    <Section
      variant="primary"
      size="wide"
      className="bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[var(--primary-dark)] py-16 md:py-20"
      decoration={
        <div
          aria-hidden
          className="absolute -top-40 -right-40 w-[40rem] h-[40rem] rounded-full bg-[var(--primary-light)]/30 blur-3xl pointer-events-none"
        />
      }
    >
      <Reveal className="text-center max-w-3xl mx-auto">
        <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.1] tracking-tight text-white">
          Prêt à signer votre prochain devis ?
        </h2>
        <p className="mt-5 text-lg text-white/85 leading-relaxed max-w-xl mx-auto">
          Créez votre compte. 14 jours d’essai. Aucune carte requise.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="/inscription" variant="primary-inverted" icon>
            Créer mon compte
          </Button>
          <Button
            href="/#comment-ca-marche"
            variant="secondary-outline-light"
          >
            Voir comment ça marche
          </Button>
        </div>
      </Reveal>
    </Section>
  );
}
