"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface StartOptions {
  /** Free-text client name to mention to Émile (e.g. from the clients list). */
  clientName?: string;
}

interface StartResult {
  startNewQuote: (opts?: StartOptions) => Promise<void>;
  starting: boolean;
}

/**
 * Single source of truth for "open a new quote". All quote-creation entry
 * points route through Émile (the conversational rédacteur) — never to a
 * standalone form. This hook:
 *   1. POSTs /api/conversations to create a fresh conversation
 *   2. Navigates to /dashboard/emile/<id>?start=<seed prompt>
 *
 * EmileChat reads the `start` query param after hydration and auto-sends the
 * seed message, which makes Émile reply with his [CLIENT_PICKER] prompt.
 */
export function useStartEmileQuote(): StartResult {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const startNewQuote = useCallback(
    async (opts?: StartOptions) => {
      if (starting) return;
      setStarting(true);
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { conversation: { id: string } };
        const seed = opts?.clientName?.trim()
          ? `Je veux créer un nouveau devis pour ${opts.clientName.trim()}`
          : "Je veux créer un nouveau devis";
        router.push(
          `/dashboard/emile/${json.conversation.id}?start=${encodeURIComponent(seed)}`,
        );
      } finally {
        setStarting(false);
      }
    },
    [router, starting],
  );

  return { startNewQuote, starting };
}
