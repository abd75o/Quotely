"use client";

import { IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { ScrollIndicator } from "@/components/landing/ScrollIndicator";
import { AudioWave } from "@/components/landing/AudioWave";
import { HeroMockup } from "@/components/landing/HeroMockup";
import { useUser } from "@/hooks/useUser";

const TRUST = [
  "Plan gratuit disponible",
  "Sans carte bancaire",
  "Résiliable en un clic",
];

export function Hero() {
  const { isAuthenticated, isLoading } = useUser();
  const showAuthedCta = !isLoading && isAuthenticated;

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-white via-white to-[#FBFAF7] flex flex-col justify-center min-h-screen min-h-[100svh] pt-24 md:pt-20 pb-12 md:pb-32">
      <AudioWave />

      <div className="relative w-full max-w-[1600px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Copy — sans-serif (Inter) extrabold for the new value-prop hero. */}
          <div className="lg:col-span-7 animate-fade-in-up text-center lg:text-left">
            <h1 className="font-sans text-[36px] sm:text-[44px] md:text-[60px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)]">
              Devis BTP en 2 minutes,
              <br />
              <span className="text-[var(--primary)]">
                signature en 1 clic.
              </span>
            </h1>

            <p className="mt-6 text-base md:text-xl leading-relaxed text-[var(--text-secondary)] max-w-xl mx-auto lg:mx-0">
              Émile, ton assistant IA, rédige tes devis pendant que tu encaisses
              tes chantiers. Plus simple, plus rapide, plus signé.
            </p>

            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
              {showAuthedCta ? (
                <Button href="/dashboard" variant="primary" icon>
                  Accéder à mon espace
                </Button>
              ) : (
                <Button href="/inscription" variant="primary" icon>
                  Essayer gratuitement
                </Button>
              )}
              <Button href="#comment-ca-marche" variant="secondary">
                Voir une démo
              </Button>
            </div>

            {!showAuthedCta && (
              <div className="mt-6 md:mt-8 flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-[13px] text-[var(--text-muted)]">
                {TRUST.map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <IconCheck size={14} className="text-[var(--primary)]" />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Hero mockup */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end animate-fade-in-up mt-4 lg:mt-0">
            <HeroMockup />
          </div>
        </div>
      </div>

      <ScrollIndicator targetId="comment-ca-marche" />
    </section>
  );
}
