"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";

interface TypingIndicatorProps {
  activeToolName: string | null;
}

const GENERIC_PHRASES = [
  "Émile écrit…",
  "Émile rédige ta réponse…",
  "Émile cherche les bonnes infos…",
  "Émile relit ton chantier…",
  "Émile structure les prestations…",
  "Émile ajuste les détails…",
];

const TOOL_PHRASES: Record<string, string[]> = {
  saveQuoteDraft: [
    "Émile prépare le devis…",
    "Émile met à jour les lignes…",
    "Émile structure les prestations…",
  ],
  calculateTVA: [
    "Émile calcule la TVA…",
    "Émile vérifie le taux applicable…",
  ],
  getMentionsLegales: [
    "Émile vérifie les mentions légales…",
    "Émile rassemble les mentions du métier…",
  ],
  findClient: [
    "Émile cherche le client…",
    "Émile fouille tes contacts…",
  ],
  createClient: [
    "Émile crée la fiche client…",
  ],
  getUserProfile: [
    "Émile lit ton profil…",
  ],
  checkProfileCompleteness: [
    "Émile vérifie ton profil…",
  ],
  getUserPastPrices: [
    "Émile consulte tes prix mémorisés…",
  ],
  saveUserPrestation: [
    "Émile mémorise ce prix…",
  ],
  sendQuote: [
    "Émile envoie le devis au client…",
    "Émile génère le PDF…",
  ],
};

export function TypingIndicator({ activeToolName }: TypingIndicatorProps) {
  const phrases = useMemo(() => {
    if (activeToolName && TOOL_PHRASES[activeToolName]) {
      return TOOL_PHRASES[activeToolName];
    }
    return GENERIC_PHRASES;
  }, [activeToolName]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [phrases]);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(id);
  }, [phrases]);

  return (
    <div className="emile-bubble-enter-assistant flex items-end gap-2">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-bg)]">
        <Pencil className="h-3.5 w-3.5 text-[var(--primary)]" />
      </div>
      <div className="flex max-w-[80%] items-center gap-2 rounded-2xl rounded-bl-md border border-[var(--border)] bg-white px-3.5 py-2 text-[13px] shadow-sm">
        <span className="inline-flex items-center gap-1">
          <Dot delay={0} />
          <Dot delay={160} />
          <Dot delay={320} />
        </span>
        <span className="italic text-[var(--text-muted)]">
          {phrases[index]}
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="emile-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
