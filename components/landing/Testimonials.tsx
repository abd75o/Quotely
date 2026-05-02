import { Quote, Star, MessageCircle, User } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";

export function Testimonials() {
  return (
    <Section
      variant="default"
      id="testimonials"
      className="py-16 md:py-20 bg-gradient-to-br from-white via-[#FFFBEA] to-[#F5F3FF]"
      decoration={
        <>
          <div
            aria-hidden
            className="hidden md:block absolute top-0 left-0 w-[350px] h-[350px] -translate-y-1/3 -translate-x-1/4 rounded-full bg-[var(--accent-warm)] opacity-30 blur-3xl pointer-events-none -z-10"
          />
          <div
            aria-hidden
            className="hidden md:block absolute bottom-0 right-0 w-[400px] h-[400px] translate-y-1/4 translate-x-1/4 rounded-3xl bg-[#8B5CF6] opacity-25 blur-3xl pointer-events-none -z-10"
          />
        </>
      }
    >
      <Reveal className="relative max-w-2xl mx-auto text-center mb-12">
        <Quote
          aria-hidden
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-24 text-[var(--bg-tertiary)] -z-10"
          fill="currentColor"
        />
        <h2 className="relative font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
          Premiers retours, bientôt.
        </h2>
        <p className="relative mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
          Quotely vient de sortir. Les premiers professionnels qui le testent
          partageront leur expérience ici, dès qu’elle sera vécue.
        </p>
      </Reveal>

      <RevealStagger className="grid sm:grid-cols-3 gap-4 lg:gap-6 max-w-5xl mx-auto mb-10">
        {/* Card 1 — placeholder profil */}
        <RevealItem>
          <article className="h-full p-8 bg-white rounded-2xl border-[1.5px] border-[var(--border)] opacity-70">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">Bientôt</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Prochainement
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)] italic leading-relaxed">
              Le retour de votre métier ici…
            </p>
          </article>
        </RevealItem>

        {/* Card 2 — placeholder note */}
        <RevealItem className="hidden sm:block">
          <article className="h-full p-8 bg-white rounded-2xl border-[1.5px] border-[var(--border)] opacity-70">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-[var(--accent-warm)]"
                  fill="currentColor"
                />
              ))}
            </div>
            <p className="text-sm text-[var(--text-muted)] italic leading-relaxed">
              Vos premiers retours s’afficheront ici…
            </p>
          </article>
        </RevealItem>

        {/* Card 3 — placeholder discussion */}
        <RevealItem className="hidden sm:block">
          <article className="h-full p-8 bg-white rounded-2xl border-[1.5px] border-[var(--border)] opacity-70">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-bg)] flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)] italic leading-relaxed">
              Rejoignez les premiers utilisateurs.
            </p>
          </article>
        </RevealItem>
      </RevealStagger>

      <Reveal className="text-center" delay={0.2}>
        <Button href="/inscription" variant="primary" icon>
          Devenir l’un des premiers
        </Button>
      </Reveal>
    </Section>
  );
}
