import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuoteForm } from "@/components/quotes/QuoteForm";

export const metadata: Metadata = {
  title: "Le Rédacteur — Quovi",
};

export default function RedacteurPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <Link
          href="/dashboard/equipe"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l&apos;équipe
        </Link>
        <div className="mt-3 border-b border-[var(--border-light)] pb-5">
          <h1 className="text-2xl font-medium text-[var(--text-primary)]">
            Le Rédacteur
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Génération de devis — décris ton chantier, il rédige un devis pro en
            30 secondes.
          </p>
        </div>
      </header>

      <QuoteForm />
    </div>
  );
}
