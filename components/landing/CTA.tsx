"use client";

import { IconCheck, IconFlag, IconLock, IconShield } from "@tabler/icons-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Highlight } from "@/components/ui/Highlight";
import { Reveal } from "@/components/ui/Reveal";
import { useUserState } from "@/lib/hooks/useUserState";

const REASSURANCES = [
  "Plan gratuit disponible",
  "Sans carte bancaire",
  "Résiliable en un clic",
];

const TRUST = [
  { Icon: IconShield, label: "Conforme RGPD" },
  { Icon: IconFlag, label: "Hébergé en France" },
  { Icon: IconLock, label: "Paiement sécurisé Stripe" },
];

export function CTA() {
  const { state, isLoading } = useUserState();
  const effectiveState = isLoading ? "visitor" : state;
  const isVisitor = effectiveState === "visitor";

  return (
    <Section
      variant="primary"
      size="wide"
      className="bg-[var(--primary)]"
      decoration={
        <div
          aria-hidden
          className="absolute -top-40 -right-40 w-[40rem] h-[40rem] rounded-full bg-[var(--primary-light)]/30 blur-3xl pointer-events-none"
        />
      }
    >
      <Reveal className="text-center max-w-3xl mx-auto">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.05em] text-white/60 mb-4">
          7.0 · Démarrer
        </p>
        <h2 className="font-display text-[32px] md:text-[48px] font-medium leading-[1.1] tracking-[-0.025em] text-white">
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
                Démarrer gratuitement
              </Button>
              <Button href="#tarifs" variant="secondary-outline-light">
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
          <>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
              {REASSURANCES.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <IconCheck size={16} className="text-white/85 flex-shrink-0" />
                  <span className="text-sm font-medium text-white/85">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-white/70">
              {TRUST.map(({ Icon, label }, i) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5"
                >
                  <Icon size={14} />
                  {label}
                  {i < TRUST.length - 1 && (
                    <span aria-hidden className="text-white/40 ml-2">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
          </>
        )}
      </Reveal>
    </Section>
  );
}
