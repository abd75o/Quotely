import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Manifesto } from "@/components/landing/Manifesto";
import { Features } from "@/components/landing/Features";
import { PricingTeaser } from "@/components/landing/PricingTeaser";
import { Reassurance } from "@/components/landing/Reassurance";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Manifesto />
        <Features />
        <PricingTeaser />
        <Reassurance />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
