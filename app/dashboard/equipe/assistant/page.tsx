import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssistantPanel } from "@/components/ai/AssistantPanel";

export const metadata: Metadata = {
  title: "L'Assistant — Quovi",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <header className="mb-4 flex-shrink-0">
        <Link
          href="/dashboard/equipe"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l&apos;équipe
        </Link>
        <div className="mt-3">
          <h1 className="text-2xl font-medium text-[var(--text-primary)]">
            L&apos;Assistant
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Support général — t&apos;aide à naviguer dans Quovi et répond à tes
            questions.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <AssistantPanel />
      </div>
    </div>
  );
}
