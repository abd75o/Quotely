"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, MessageSquare, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { EmileChat } from "./EmileChat";
import { QuotePreview } from "./QuotePreview";
import { QuoteFullscreen, type EmitterSnapshot } from "./QuoteFullscreen";
import { formatSiret } from "@/lib/format/siret";
import { NewQuoteLineModal } from "./NewQuoteLineModal";
import {
  ClientSelectorModal,
  type ExistingClient,
} from "./ClientSelectorModal";
import { toastError, toastSuccess } from "@/lib/toast";
import type {
  EmileQuoteDraft,
  EmileQuoteLine,
  EmileQuoteStatus,
} from "./types";
import type { EmileQuoteUpdate } from "@/hooks/useEmile";

const KNOWN_STATUSES: EmileQuoteStatus[] = [
  "draft",
  "ready",
  "sent",
  "viewed",
  "signed",
  "refused",
  "expired",
];

function coerceStatus(raw: string | undefined): EmileQuoteStatus | undefined {
  if (!raw) return undefined;
  // The DB status set is a superset (e.g. "pending", "invoiced"); collapse
  // unknowns to a sensible UI bucket so the right-panel badge doesn't crash
  // out on a status it doesn't render.
  if ((KNOWN_STATUSES as string[]).includes(raw)) {
    return raw as EmileQuoteStatus;
  }
  if (raw === "pending") return "sent";
  if (raw === "invoiced") return "signed";
  return undefined;
}

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
  // Client / status: hydration from a full DB row supplies them, tool-emitted
  // updates don't — fall back to the previous value rather than wiping it.
  const client = update.client !== undefined ? update.client : (previous?.client ?? null);
  const status = coerceStatus(update.status) ?? previous?.status ?? "draft";
  return {
    id: update.quoteId ?? previous?.id,
    number: update.number ?? previous?.number ?? "—",
    client,
    date: previous?.date ?? todayLabel(),
    validity: previous?.validity ?? 90,
    tva: update.taxRate ?? previous?.tva ?? 20,
    lines,
    status,
  };
}

const RCS_LEGAL_STATUSES = new Set(["sarl", "sas", "sasu", "eurl"]);
const RM_LEGAL_STATUSES = new Set(["ei", "auto-entrepreneur"]);

function buildRegistrationLabel(
  number: string | null,
  city: string | null,
  legalStatus: string | null,
): string | null {
  if (!number) return null;
  const status = (legalStatus ?? "").toLowerCase().trim();
  if (RCS_LEGAL_STATUSES.has(status)) {
    return city ? `RCS ${city} ${number}` : `RCS ${number}`;
  }
  if (RM_LEGAL_STATUSES.has(status)) return `RM ${number}`;
  return `N° ${number}`;
}

export function EmileLayout({ conversationId }: EmileLayoutProps) {
  const [quote, setQuote] = useState<EmileQuoteDraft | null>(null);
  const [emitter, setEmitter] = useState<EmitterSnapshot | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [fullscreen, setFullscreen] = useState(false);
  const [showNewLine, setShowNewLine] = useState(false);
  // Direct (non-LLM) client picker for "Sélectionner un client" in the quote
  // preview. Lives in the layout so the same modal serves the side panel and
  // the fullscreen view; PATCHes /api/quotes/:id on select.
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Issuer snapshot for the QuoteFullscreen "Émetteur" card. Fetched once
  // per mount — /api/profile reads the artisan's own row (RLS-friendly, the
  // artisan is logged in here) and the cards downstream get the same shape.
  // Cheap GET, no auto-refresh; the artisan edits profile in another tab.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: { profile?: Record<string, string | null> }) => {
        if (cancelled) return;
        const p = json.profile ?? {};
        const company =
          (p.company_name as string | null) ||
          (p.company as string | null) ||
          null;
        if (!company) {
          setEmitter(null);
          return;
        }
        const siretRaw = (p.siret as string | null) ?? null;
        const siret = siretRaw ? formatSiret(siretRaw) || siretRaw : null;
        setEmitter({
          company,
          address: (p.address as string | null) ?? null,
          postal_code: (p.postal_code as string | null) ?? null,
          city: (p.city as string | null) ?? null,
          siret,
          decennale_company: (p.decennale_company as string | null) ?? null,
          decennale_number: (p.decennale_number as string | null) ?? null,
          rc_pro_number: (p.rc_pro_number as string | null) ?? null,
          registration_label: buildRegistrationLabel(
            (p.registration_number as string | null) ?? null,
            (p.registration_city as string | null) ?? null,
            (p.legal_status as string | null) ?? null,
          ),
        });
      })
      .catch((err) => {
        console.warn("[EmileLayout] profile fetch failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleQuoteUpdate = useCallback((update: EmileQuoteUpdate) => {
    setQuote((prev) => updateToDraft(update, prev));
  }, []);

  const handleConversationCreated = useCallback((id: string) => {
    // ROOT CAUSE of "Émile ne répond pas au 1er message":
    // On the very first message of a brand-new chat, sendMessage() creates the
    // conversation and then immediately streams /api/emile/chat. Using
    // router.replace() here navigates /dashboard/emile (page.tsx) →
    // /dashboard/emile/[conversationId] — two DISTINCT route segments — which
    // UNMOUNTS this EmileLayout, EmileChat and the useEmile hook driving the
    // in-flight stream. The fresh mount then runs loadConversation() against a
    // conversation whose assistant reply isn't persisted yet (the route persists
    // in onFinish, seconds later), so the user sees no answer until a manual
    // reload. The 2nd message works because conversationId is already set, so no
    // navigation happens.
    //
    // We only need the URL bar to reflect the id (refresh / share).
    // window.history.replaceState updates the URL WITHOUT a Next.js route change,
    // so the component stays mounted and the stream keeps rendering in place.
    // usePathname/useSearchParams stay in sync, and a real reload still resolves
    // the [conversationId] server page correctly.
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/dashboard/emile/${id}`);
    }
  }, []);

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

  const handleOpenClientPicker = useCallback(() => {
    if (!quote?.id) return;
    setClientPickerOpen(true);
  }, [quote]);

  const handlePickClient = useCallback(
    async (picked: ExistingClient) => {
      setClientPickerOpen(false);
      if (!quote?.id) return;
      try {
        const res = await fetch(`/api/quotes/${quote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: picked.id }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as {
          quote?: {
            client_id?: string | null;
            client?: {
              id: string;
              name: string;
              first_name?: string | null;
              email?: string | null;
              phone?: string | null;
              address?: string | null;
              postal_code?: string | null;
              city?: string | null;
              type_client?: "particulier" | "professionnel" | null;
              siret?: string | null;
            } | null;
          };
        };
        const c = json.quote?.client ?? null;
        // Hydrate the right-panel synchronously from the API response — the
        // PUT already wrote to DB, no second round-trip needed for the user
        // to see "Pour <Nom>" replace "Aucun client sélectionné".
        setQuote((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            client: c
              ? {
                  id: c.id,
                  name: c.name,
                  first_name: c.first_name ?? null,
                  email: c.email ?? null,
                  phone: c.phone ?? null,
                  address: c.address ?? null,
                  postal_code: c.postal_code ?? null,
                  city: c.city ?? null,
                  type_client: c.type_client ?? null,
                  siret: c.siret ?? null,
                }
              : {
                  id: picked.id,
                  name: picked.name,
                  first_name: picked.first_name ?? null,
                  email: picked.email ?? null,
                  phone: picked.phone ?? null,
                },
          };
        });
        toastSuccess("Client rattaché au devis.");
      } catch (e) {
        console.error("[link client]", e);
        toastError("Impossible de rattacher le client. Réessaie.");
      }
    },
    [quote],
  );

  // Reset the right-panel quote whenever the conversation changes. useEmile
  // re-runs loadConversation on the same trigger and calls handleQuoteUpdate
  // again if the new conv has a linked quote — so the panel re-populates
  // automatically. Without this reset, navigating from conv A (with devis)
  // to conv B (no devis) leaves A's draft on screen until the user touches
  // something.
  useEffect(() => {
    setQuote(null);
  }, [conversationId]);

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
            activeQuoteLineCount={quote?.lines.length ?? 0}
            activeQuoteNumber={quote?.number ?? null}
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
              onPickClient={handleOpenClientPicker}
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
                onPickClient={handleOpenClientPicker}
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
          onPickClient={handleOpenClientPicker}
          emitter={emitter}
        />
      )}

      <NewQuoteLineModal
        open={showNewLine}
        onClose={() => setShowNewLine(false)}
        defaultTva={quote?.tva ?? 20}
        onAdd={handleAddLineFromModal}
      />

      <ClientSelectorModal
        open={clientPickerOpen}
        onClose={() => setClientPickerOpen(false)}
        onSelect={handlePickClient}
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

