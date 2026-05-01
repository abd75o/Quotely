import { Quote } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function Testimonials() {
  return (
    <Section variant="default" id="testimonials">
      <Reveal className="relative max-w-2xl mx-auto text-center">
        <Quote
          aria-hidden
          className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-32 text-[var(--bg-tertiary)] -z-10"
          fill="currentColor"
        />

        <h2 className="relative font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
          Premiers retours, bientôt.
        </h2>
        <p className="relative mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
          Quotely vient de sortir. Les premiers professionnels qui le testent
          partageront leur expérience ici, dès qu’elle sera vécue.
        </p>

        <div className="relative mt-8">
          <Button href="/inscription" variant="secondary" icon>
            Devenir l’un des premiers
          </Button>
        </div>
      </Reveal>
    </Section>
  );
}
