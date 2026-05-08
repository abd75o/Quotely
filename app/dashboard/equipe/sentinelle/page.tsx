import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "La Sentinelle — Quovi",
};

export default function SentinellePage() {
  return (
    <div className="mx-auto max-w-4xl">
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
            La Sentinelle
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Suivi & relances — surveille tes devis envoyés et te prévient quand
            relancer.
          </p>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAEEDA]">
          <Eye className="h-7 w-7 text-[#BA7517]" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
          Bientôt disponible
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          Cette fonctionnalité arrive en Phase 4 (mi-mai 2026). La Sentinelle
          surveillera tes devis envoyés et te préviendra automatiquement quand
          il faut relancer.
        </p>
      </div>
    </div>
  );
}
