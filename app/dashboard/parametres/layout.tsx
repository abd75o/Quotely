import type { ReactNode } from "react";
import { ParametresTabs } from "@/components/dashboard/ParametresTabs";

export const metadata = {
  title: "Paramètres — Quotely",
  robots: { index: false, follow: false },
};

export default function ParametresLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Paramètres
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
          Configurez votre entreprise et gérez votre abonnement.
        </p>
      </header>

      <ParametresTabs />

      <div className="mt-6">{children}</div>
    </div>
  );
}
