import { Quote, User, Star, MessageCircle } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

type Placeholder = {
  icon: React.ElementType;
  label: string;
};

const PLACEHOLDERS: Placeholder[] = [
  { icon: User, label: "Bientôt votre témoignage ici." },
  { icon: Star, label: "Vos premiers retours s’afficheront ici." },
  { icon: MessageCircle, label: "Rejoignez les premiers utilisateurs." },
];

export function Testimonials() {
  return (
    <Section variant="default" id="testimonials" className="py-12 md:py-16">
      <Reveal className="relative max-w-2xl mx-auto text-center">
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

        <div className="relative mt-6">
          <Button href="/inscription" variant="secondary" icon>
            Devenir l’un des premiers
          </Button>
        </div>
      </Reveal>

      <RevealStagger className="mt-12 grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {PLACEHOLDERS.map((p, i) => (
          <RevealItem
            key={p.label}
            className={cn(i > 0 && "hidden sm:block")}
          >
            <article className="flex items-center gap-4 p-5 bg-white rounded-xl border border-[var(--border)] opacity-60 h-full">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                <p.icon className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-snug">
                {p.label}
              </p>
            </article>
          </RevealItem>
        ))}
      </RevealStagger>
    </Section>
  );
}
