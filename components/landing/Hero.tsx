import { Button } from "@/components/ui/Button";
import { Highlight } from "@/components/ui/Highlight";
import { ScrollIndicator } from "@/components/landing/ScrollIndicator";
import { AudioWave } from "@/components/landing/AudioWave";
import { HeroMockup } from "@/components/landing/HeroMockup";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-white via-white to-[#FAFAF7] flex flex-col justify-center min-h-screen min-h-[100svh] pt-24 md:pt-20 pb-12 md:pb-32">
      <AudioWave />

      <div className="relative w-full max-w-[1600px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Copy */}
          <div className="lg:col-span-7 animate-fade-in-up text-center lg:text-left">
            <h1 className="font-display text-[36px] sm:text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-tight text-[var(--text-primary)]">
              Pendant que vous écrivez,{" "}
              <Highlight variant="primary">ils signent ailleurs</Highlight>.
            </h1>

            <p className="mt-6 text-base md:text-xl leading-relaxed text-[var(--text-secondary)] max-w-xl mx-auto lg:mx-0">
              Quovi, le devis qui part avant que vous passiez à autre chose.
              Le client signe sur place, sur son téléphone.
            </p>

            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <Button href="/inscription" variant="primary" icon>
                Créer mon premier devis
              </Button>
              <Button href="#comment-ca-marche" variant="secondary">
                Voir comment ça marche
              </Button>
            </div>
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
