import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/landing/Hero";
import { TeamSection } from "@/components/landing/TeamSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Manifesto } from "@/components/landing/Manifesto";
import { PricingTeaser } from "@/components/landing/PricingTeaser";
import { ChangelogPreview } from "@/components/landing/ChangelogPreview";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TeamSection />
        <HowItWorks />
        <Manifesto />
        <PricingTeaser />
        <ChangelogPreview />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
