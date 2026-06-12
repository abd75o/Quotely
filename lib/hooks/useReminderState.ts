"use client";

import { useCallback, useEffect, useState } from "react";

// État de relance d'un devis tel qu'exposé par GET /api/quotes/[id]/remind.
// Partagé par la page détail (QuotePreview) et le widget dashboard
// (PendingQuotesList) pour un comportement de cooldown identique des deux côtés.
export interface ReminderState {
  canRemind: boolean;
  statusRemindable: boolean;
  lastManualAt: string | null;
  lastAutoAt: string | null;
  hoursUntilAllowed: number;
  lastAutoHoursAgo: number | null;
  cooldownHours: number;
}

export interface RemindResult {
  ok: boolean;
  clientName?: string;
  error?: string;
  retryAfterHours?: number;
}

export function useReminderState(
  quoteId: string,
  opts?: { enabled?: boolean },
) {
  const enabled = opts?.enabled ?? true;
  const [state, setState] = useState<ReminderState | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(`/api/quotes/${quoteId}/remind`, {
        method: "GET",
      });
      if (!res.ok) return;
      setState((await res.json()) as ReminderState);
    } catch {
      // silencieux : l'absence d'état laisse le bouton dans son état par défaut.
    } finally {
      setLoading(false);
    }
  }, [quoteId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      await refresh();
    })();
  }, [refresh, enabled]);

  const remind = useCallback(async (): Promise<RemindResult> => {
    setSending(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/remind`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        clientName?: string;
        error?: string;
        retryAfterHours?: number;
      };
      if (!res.ok) {
        return {
          ok: false,
          error: data.error ?? "Échec de la relance",
          retryAfterHours: data.retryAfterHours,
        };
      }
      return { ok: true, clientName: data.clientName };
    } catch {
      return { ok: false, error: "Impossible d'envoyer la relance" };
    } finally {
      setSending(false);
      // Recharge l'état (succès → repasse en cooldown ; 409 → garde l'état).
      await refresh();
    }
  }, [quoteId, refresh]);

  return { state, loading, sending, remind, refresh };
}
