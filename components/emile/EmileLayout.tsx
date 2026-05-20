"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, MessageSquare, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { EmileChat } from "./EmileChat";
import { QuotePreview } from "./QuotePreview";
import { QuoteFullscreen } from "./QuoteFullscreen";
import { NewQuoteLineModal } from "./NewQuoteLineModal";
import type { EmileQuoteDraft, EmileQuoteLine } from "./types";
import type { EmileQuoteUpdate } from "@/hooks/useEmile";

interface EmileLayoutProps {
  conversationId?: string;
}

type MobileView = "list" | "chat" | "quote";

function todayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function updateToDraft(
  update: EmileQuoteUpdate,
  previous: EmileQuoteDraft | null,
): EmileQuoteDraft {
  // Partial updates (e.g. just totals after a status change) must NOT erase
  // the lines we already had on screen — `update.items === undefined` keeps
  // previous.lines; an empty array (`[]`) is treated as an explicit clear.
  const lines = update.items
    ? update.items.map((l, idx) => ({
        id: String(l.id ?? `l-${idx}`),
        label: String(l.libelle ?? l.label ?? "Prestation"),
        price: Number(l.prixHT ?? l.price ?? 0),
        quantity: Number(l.quantite ?? l.quantity ?? 1),
        unit: (l.unite as string | null | undefined) ?? null,
        tva:
          typeof l.tauxTVA === "number"
            ? l.tauxTVA
            : typeof l.tva === "number"
              ? l.tva
              : null,
      }))
    : (previous?.lines ?? []);
  return {
    id: update.quoteId ?? previous?.id,
    number: update.number ?? previous?.number ?? "—",
    client: previous?.client ?? null,
    date: previous?.date ?? todayLabel(),
    validity: previous?.validity ?? 90,
    tva: update.taxRate ?? previous?.tva ?? 20,
    lines,
    status: previous?.status ?? "draft",
  };
}

export function EmileLayout({ conversationId }: EmileLayoutProps) {
  const router = useRouter();
  const [quote, setQuote] = useState<EmileQuoteDraft | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [fullscreen, setFullscreen] = useState(false);
  const [showNewLine, setShowNewLine] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQuoteUpdate = useCallback((update: EmileQuoteUpdate) => {
    setQuote((prev) => updateToDraft(update, prev));
  }, []);

  const handleConversationCreated = useCallback(
    (id: string) => {
      // Replace the URL so refresh / sharing keeps the conversation
      router.replace(`/dashboard/emile/${id}`);
    },
    [router],
  );

  // Debounced save when the user edits the quote in the panel/fullscreen.
  const handleQuoteEdit = useCallback((next: EmileQuoteDraft) => {
    setQuote(next);
    if (!next.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistQuote(next);
    }, 500);
  }, []);

  const handleAddLineFromModal = useCallback(
    (line: EmileQuoteLine) => {
      setQuote((prev) => {
        if (!prev) return prev;
        const next = { ...prev, lines: [...prev.lines, line] };
        if (next.id) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            void persistQuote(next);
          }, 200);
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full flex-col lg:h-[calc(100vh-4rem)]">
      {/* Desktop : 3 colonnes */}
      <div className="hidden h-full min-h-0 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_380px] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[var(--border)] lg:bg-white lg:shadow-sm">
        <ConversationsSidebar activeConversationId={conversationId} />
        <div className="flex min-h-0 min-w-0 flex-col">
          <ChatHeader />
          <EmileChat
            conversationId={conversationId}
            onQuoteUpdate={handleQuoteUpdate}
            onConversationCreated={handleConversationCreated}
          />
        </div>
        {/* The desktop layout sits to the right of the chat */}
        <div className="min-h-0 border-l border-[var(--border)]">
          {quote ? (
            <QuotePreview
              quote={quote}
              onUpdate={handleQuoteEdit}
              onOpenFullscreen={() => setFullscreen(true)}
              onOpenAddLine={() => setShowNewLine(true)}
            />
          ) : (
            <QuotePlaceholder />
          )}
        </div>
      </div>

      {/* Mobile : 3 vues + tab bar bottom */}
      <div className="flex h-full min-h-0 flex-col lg:hidden">
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          {mobileView === "list" && (
            <ConversationsSidebar activeConversationId={conversationId} />
          )}
          {mobileView === "chat" && (
            <div className="flex h-full min-h-0 flex-col">
              <ChatHeader
                rightAction={
                  quote ? (
                    <button
                      type="button"
                      onClick={() => setMobileView("quote")}
                      className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary-bg)]"
                    >
                      Voir le devis
                    </button>
                  ) : undefined
                }
              />
              <EmileChat
                conversationId={conversationId}
                onQuoteUpdate={handleQuoteUpdate}
                onConversationCreated={handleConversationCreated}
              />
            </div>
          )}
          {mobileView === "quote" &&
            (quote ? (
              <QuotePreview
                quote={quote}
                onUpdate={handleQuoteEdit}
                onClose={() => setMobileView("chat")}
                onOpenFullscreen={() => setFullscreen(true)}
                onOpenAddLine={() => setShowNewLine(true)}
              />
            ) : (
              <QuotePlaceholder />
            ))}
        </div>

        <nav className="mt-3 flex flex-shrink-0 items-center justify-around rounded-2xl border border-[var(--border)] bg-white p-1 shadow-sm">
          <TabButton
            icon={MessageSquare}
            label="Conv"
            active={mobileView === "list"}
            onClick={() => setMobileView("list")}
          />
          <TabButton
            icon={Pencil}
            label="Émile"
            active={mobileView === "chat"}
            onClick={() => setMobileView("chat")}
          />
          <TabButton
            icon={FileText}
            label="Devis"
            active={mobileView === "quote"}
            onClick={() => setMobileView("quote")}
          />
        </nav>
      </div>

      {fullscreen && quote && (
        <QuoteFullscreen
          quote={quote}
          onUpdate={handleQuoteEdit}
          onClose={() => setFullscreen(false)}
          onOpenAddLine={() => setShowNewLine(true)}
        />
      )}

      <NewQuoteLineModal
        open={showNewLine}
        onClose={() => setShowNewLine(false)}
        defaultTva={quote?.tva ?? 20}
        onAdd={handleAddLineFromModal}
      />
    </div>
  );
}

async function persistQuote(quote: EmileQuoteDraft): Promise<void> {
  if (!quote.id) return;
  // Forward per-line tva and unite — the PUT route normalizes either shape
  // but we send the canonical one to keep the JSONB consistent with what
  // bulk-lines / saveQuoteDraft / Émile produce. Falling back to the global
  // quote.tva for lines without an explicit rate keeps the single-rate UX
  // unchanged.
  const items = quote.lines.map((l) => ({
    id: l.id,
    label: l.label,
    quantity: l.quantity,
    unite: l.unit ?? null,
    price: l.price,
    tva: typeof l.tva === "number" ? l.tva : quote.tva,
    total: +(l.quantity * l.price).toFixed(2),
  }));
  try {
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, taxRate: quote.tva }),
    });
    if (!res.ok) {
      console.error("[QUOTE SAVE] failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("[QUOTE SAVE] network error", e);
  }
}

function ChatHeader({ rightAction }: { rightAction?: React.ReactNode }) {
  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-bg)]">
          <Pencil className="h-4 w-4 text-[var(--primary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Émile
          </p>
          <p className="flex items-center gap-1 text-[11px] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            En ligne · Le Rédacteur
          </p>
        </div>
      </div>
      {rightAction}
    </header>
  );
}

function QuotePlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--surface)] px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-bg)]">
        <FileText className="h-6 w-6 text-[var(--primary)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        Pas encore de devis
      </p>
      <p className="mt-1 max-w-xs text-[12px] text-[var(--text-secondary)]">
        Quand Émile aura assez d&apos;infos, il génère un brouillon ici. Tu
        peux modifier chaque ligne directement.
      </p>
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MessageSquare;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition-colors",
        active
          ? "bg-[var(--primary-bg)] text-[var(--primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface)]",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

