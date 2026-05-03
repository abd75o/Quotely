"use client";

import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Highlight } from "@/components/ui/Highlight";
import { Reveal } from "@/components/ui/Reveal";
import { CheckCircle2 } from "lucide-react";
import { useUserState } from "@/lib/hooks/useUserState";

const REASSURANCES = ["14 jours offerts", "Sans carte bancaire", "Résiliable en un clic"];

export function CTA() {
  const { state, isLoading } = useUserState();
  const effectiveState = isLoading ? "visitor" : state;
  const isVisitor = effectiveState === "visitor";

  return (
    <Section
      variant="primary"
      size="wide"
      className="bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[var(--primary-dark)]"
      decoration={
        <div
          aria-hidden
          className="absolute -top-40 -right-40 w-[40rem] h-[40rem] rounded-full bg-[var(--primary-light)]/30 blur-3xl pointer-events-none"
        />
      }
    >
      <Reveal className="text-center max-w-3xl mx-auto">
        <h2 className="font-display text-[32px] md:text-[48px] font-bold leading-[1.1] tracking-tight text-white">
          {isVisitor ? (
            <>
              Votre prochain devis pourrait être signé{" "}
              <Highlight variant="light">ce soir</Highlight>.
            </>
          ) : (
            <>Prêt à signer votre prochain devis ?</>
          )}
        </h2>

        <p className="mt-6 text-lg md:text-xl text-white/85 leading-relaxed max-w-xl mx-auto">
          {isVisitor
            ? "Créez votre compte. Testez sur un cas réel. Décidez ensuite."
            : "Allez à votre espace et créez un nouveau devis."}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {isVisitor ? (
            <>
              <Button href="/inscription" variant="primary-inverted" icon>
                Démarrer · 14 jours gratuits
              </Button>
              <Button href="/tarifs" variant="secondary-outline-light">
                Voir les tarifs
              </Button>
            </>
          ) : (
            <Button href="/dashboard" variant="primary-inverted" icon>
              Mon espace
            </Button>
          )}
        </div>

        {isVisitor && (
          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {REASSURANCES.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span className="text-sm font-medium text-white/85">{item}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-xs text-white/60">
          Données hébergées en France · RGPD · Paiement sécurisé par Stripe
        </p>
      </Reveal>
    </Section>
  );
}
