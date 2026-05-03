"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Clock, Loader2, Send, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface PendingQuote {
  id: string;
  number: string;
  total: number;
  created_at: string;
  client_name: string;
  daysSince: number;
}

interface RawQuote {
  id: string;
  number: string;
  total: number | null;
  created_at: string;
  status: string | null;
  client: { name: string | null }[] | { name: string | null } | null;
}

const STALE_DAYS = 3;
const MAX_DISPLAY = 5;

function clientName(client: RawQuote["client"]): string {
  if (!client) return "Client";
  if (Array.isArray(client)) return client[0]?.name ?? "Client";
  return client.name ?? "Client";
}

export function PendingQuotesList({ className }: { className?: string }) {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<PendingQuote[]>([]);
  const [reminding, setReminding] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setQuotes([]);
            setLoading(false);
          }
          return;
        }
        const cutoff = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString();
        const { data } = await supabase
          .from("quotes")
          .select("id, number, total, created_at, status, client:clients(name)")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .lte("created_at", cutoff)
          .order("created_at", { ascending: true })
          .limit(MAX_DISPLAY);

        if (cancelled) return;

        const now = Date.now();
        const mapped: PendingQuote[] = (data ?? []).map((q) => {
          const raw = q as RawQuote;
          return {
            id: raw.id,
            number: raw.number,
            total: Number(raw.total ?? 0),
            created_at: raw.created_at,
            client_name: clientName(raw.client),
            daysSince: Math.floor((now - new Date(raw.created_at).getTime()) / 86400_000),
          };
        });
        setQuotes(mapped);
      } catch {
        if (!cancelled) setQuotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRemind(id: string) {
    setReminding(id);
    try {
      const res = await fetch(`/api/quotes/${id}/remind`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Échec de la relance");
      }
      toastSuccess("Relance envoyée au client");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Impossible d'envoyer la relance");
    } finally {
      setReminding(null);
    }
  }

  return (
    <section
      className={cn(
        "bg-white rounded-2xl border border-[var(--border)] overflow-hidden",
        className
      )}
      aria-label="Devis à relancer"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--primary)]" />
          Devis à relancer
          {quotes.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
              {quotes.length}
            </span>
          )}
        </h2>
      </div>

      {loading ? (
        <div className="py-10 flex items-center justify-center text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
            <PartyPopper className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Aucune relance en attente 🎉
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Tous vos devis récents sont à jour.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="flex items-center gap-3 px-4 sm:px-5 py-3.5"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <Link
                href={`/dashboard/quotes/${q.id}`}
                className="flex-1 min-w-0 group cursor-pointer"
              >
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--primary)] transition-colors">
                  {q.client_name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {q.number} · {q.total.toLocaleString("fr-FR")} € · en attente depuis {q.daysSince} jour
                  {q.daysSince > 1 ? "s" : ""}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => handleRemind(q.id)}
                disabled={reminding === q.id}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--primary)] bg-[var(--primary-bg)] hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg cursor-pointer transition-colors flex-shrink-0"
              >
                {reminding === q.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {reminding === q.id ? "Envoi…" : "Relancer"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
