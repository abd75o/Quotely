import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Highlight } from "@/components/ui/Highlight";
import { Reveal } from "@/components/ui/Reveal";
import { CheckCircle2 } from "lucide-react";

const REASSURANCES = ["14 jours offerts", "Sans carte bancaire", "Résiliable en un clic"];

export function CTA() {
  return (
    <Section variant="primary">
      <Reveal className="text-center max-w-3xl mx-auto">
        <h2 className="font-display text-[32px] md:text-[48px] font-bold leading-[1.1] tracking-tight text-white">
          Votre prochain devis pourrait être signé{" "}
          <Highlight variant="light">ce soir</Highlight>.
        </h2>

        <p className="mt-6 text-lg md:text-xl text-white/85 leading-relaxed max-w-xl mx-auto">
          Créez votre compte. Testez sur un cas réel. Décidez ensuite.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="/inscription" variant="primary-inverted" icon>
            Commencer maintenant
          </Button>
          <Button href="/tarifs" variant="secondary-outline-light">
            Voir les tarifs
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3">
          {REASSURANCES.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-sm font-medium text-white/85">{item}</span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-white/60">
          Données hébergées en France · RGPD · Paiement sécurisé par Stripe
        </p>
      </Reveal>
    </Section>
  );
}
