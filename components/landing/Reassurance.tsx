import { Shield, Flag, Lock } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";

type Pillar = {
  icon: React.ElementType;
  title: string;
  detail: string;
};

const PILLARS: Pillar[] = [
  {
    icon: Shield,
    title: "Conforme RGPD",
    detail: "Vos données restent privées.",
  },
  {
    icon: Flag,
    title: "Hébergé en France",
    detail: "Serveurs sécurisés sur le territoire.",
  },
  {
    icon: Lock,
    title: "Paiement sécurisé Stripe",
    detail: "CB · Apple Pay · Google Pay.",
  },
];

export function Reassurance() {
  return (
    <Section
      variant="primary"
      size="wide"
      className="bg-gradient-to-br from-[var(--primary)] to-[#8B5CF6] py-12 md:py-20"
      decoration={
        <div
          aria-hidden
          className="absolute -top-32 -right-32 w-[40rem] h-[40rem] rounded-full bg-white/10 blur-3xl pointer-events-none"
        />
      }
    >
      <Reveal className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
        <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-white">
          Une seule application. Tout ce qui compte.
        </h2>
      </Reveal>

      <RevealStagger className="grid sm:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto">
        {PILLARS.map((p) => (
          <RevealItem key={p.title} className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/10">
              <p.icon className="w-7 h-7 text-white" />
            </div>
            <p className="text-base md:text-lg font-semibold text-white">{p.title}</p>
            <p className="text-sm text-white/75 leading-relaxed">{p.detail}</p>
          </RevealItem>
        ))}
      </RevealStagger>
    </Section>
  );
}
