"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { useEmile, type EmileQuoteUpdate } from "@/hooks/useEmile";
import { EmileMessage } from "./EmileMessage";
import { TypingIndicator } from "./TypingIndicator";
import {
  QuickReplies,
  hasOpenQuoteLineModal,
  parseOpenProfileModal,
} from "./QuickReplies";
import { EmileInput } from "./EmileInput";
import { EmileEmptyState } from "./EmileEmptyState";
import { NewClientModal, type CreatedClient } from "./NewClientModal";
import { NewQuoteLineModal } from "./NewQuoteLineModal";
import {
  ClientSelectorModal,
  type ExistingClient,
} from "./ClientSelectorModal";
import {
  ProfileCompletionModal,
  type ProfileField,
  type ProfileUpdated,
} from "./ProfileCompletionModal";
import {
  BulkImportModal,
  type BulkImportSuccess,
} from "./BulkImportModal";
import type { EmileQuoteLine } from "./types";

const ALL_PROFILE_FIELDS: ProfileField[] = [
  "first_name",
  "last_name",
  "telephone",
  "company",
  "siret",
  "legal_status",
  "vat_status",
  "address",
  "postal_code",
  "city",
  "iban",
  "bic",
];

function isProfileField(v: string): v is ProfileField {
  return (ALL_PROFILE_FIELDS as string[]).includes(v);
}

interface EmileChatProps {
  conversationId?: string;
  onQuoteUpdate?: (quote: EmileQuoteUpdate) => void;
  onConversationCreated?: (id: string) => void;
}

const NEAR_BOTTOM_PX = 100;

export function EmileChat({
  conversationId,
  onQuoteUpdate,
  onConversationCreated,
}: EmileChatProps) {
  const {
    messages,
    isLoading,
    isHydrated,
    error,
    sendMessage,
    loadConversation,
    abort,
  } = useEmile({ conversationId, onQuoteUpdate, onConversationCreated });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startParam = searchParams?.get("start") ?? null;
  const autoSeededRef = useRef<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef<string | undefined>(undefined);
  const programmaticScrollRef = useRef(false);
  const lastCount = useRef(messages.length);
  // Remember which assistant messages already opened a modal so the stream's
  // re-renders (parts grow token by token) don't reopen it.
  const triggeredModalIdsRef = useRef<Set<string>>(new Set());
  // NewClientModal/NewQuoteLineModal both fire onCreated/onAdd then onClose on
  // success — without this flag the close handler would queue a cancel message
  // right after the success one.
  const justHandledModalRef = useRef(false);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [quoteLineModalOpen, setQuoteLineModalOpen] = useState(false);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileMissing, setProfileMissing] = useState<ProfileField[]>([]);
  // Bulk paste flow. `bulkRawText` is the verbatim clipboard content; the
  // modal parses it into structured rows and posts them straight to the DB
  // (bypassing the LLM, which would otherwise spend ~10k output tokens
  // regurgitating the same lines into a tool call argument).
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkRawText, setBulkRawText] = useState("");

  useEffect(() => {
    if (conversationId && loadedRef.current !== conversationId) {
      loadedRef.current = conversationId;
      void loadConversation(conversationId);
    }
  }, [conversationId, loadConversation]);

  // Switching conversations would otherwise carry over a "scrolled up" state from
  // the previous thread, leaving the freshly loaded messages stuck at the top.
  useEffect(() => {
    setPinnedToBottom(true);
    setHasNew(false);
    lastCount.current = 0;
    triggeredModalIdsRef.current = new Set();
    setClientModalOpen(false);
    setQuoteLineModalOpen(false);
    setClientSelectorOpen(false);
    setProfileModalOpen(false);
    setProfileMissing([]);
    setBulkImportOpen(false);
    setBulkRawText("");
    autoSeededRef.current = null;
  }, [conversationId]);

  // Auto-seed a freshly-created conversation. Entry points like the "Nouveau
  // devis" sidebar button navigate here with `?start=<seed>` after POSTing a
  // new conversation; we send that seed once the empty conv is hydrated, then
  // strip the query param so refresh/back never replays it.
  useEffect(() => {
    if (!startParam) return;
    if (!conversationId) return;
    if (!isHydrated) return;
    if (messages.length > 0) return;
    if (isLoading) return;
    if (autoSeededRef.current === conversationId) return;

    autoSeededRef.current = conversationId;
    const seed = startParam;
    if (pathname) {
      router.replace(pathname, { scroll: false });
    }
    void sendMessage(seed);
  }, [
    startParam,
    conversationId,
    isHydrated,
    messages.length,
    isLoading,
    pathname,
    router,
    sendMessage,
  ]);

  const checkPinned = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    return dist <= NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottomNow = useCallback((smooth: boolean) => {
    // Suppress the scroll event our own scrollIntoView fires — without this,
    // a smooth animation can transiently report `distance > 100px` and flip
    // `pinnedToBottom` to false mid-stream.
    programmaticScrollRef.current = true;
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }, []);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      scrollToBottomNow(smooth);
      setPinnedToBottom(true);
      setHasNew(false);
    },
    [scrollToBottomNow],
  );

  // Synchronous scroll right after DOM mutation = no visible "calibration" flash.
  // Streaming uses "auto" (instant) so rapid token updates don't queue up a
  // smooth-scroll storm; idle messages use "smooth" for a nicer settle.
  useLayoutEffect(() => {
    const grew = messages.length > lastCount.current;
    lastCount.current = messages.length;
    if (pinnedToBottom) {
      scrollToBottomNow(!isLoading);
    } else if (grew) {
      setHasNew(true);
    }
  }, [messages, pinnedToBottom, isLoading, scrollToBottomNow]);

  const handleScroll = useCallback(() => {
    if (programmaticScrollRef.current) {
      programmaticScrollRef.current = false;
      return;
    }
    const pinned = checkPinned();
    setPinnedToBottom(pinned);
    if (pinned) setHasNew(false);
  }, [checkPinned]);

  // Detect last assistant message to know if a tool call is in progress
  // (used by the typing indicator to vary its phrase).
  const lastMessage = messages[messages.length - 1];

  // When Émile emits [OPEN_QUOTE_LINE_MODAL] in his streamed text, pop the
  // quote-line modal. The client picker is NOT auto-opened — Émile shows the
  // 2-button [CLIENT_PICKER] (handled inside EmileMessage) and the artisan
  // chooses. We dedupe via the message id so streaming re-renders don't reopen.
  useEffect(() => {
    if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.id) {
      return;
    }
    const text = Array.isArray(lastMessage.parts)
      ? lastMessage.parts
          .filter((p) => (p as { type?: string }).type === "text")
          .map((p) => (p as { text?: string }).text ?? "")
          .join("\n")
      : "";
    if (!text) return;
    const triggered = triggeredModalIdsRef.current;
    if (triggered.has(lastMessage.id)) return;
    if (hasOpenQuoteLineModal(text)) {
      triggered.add(lastMessage.id);
      setQuoteLineModalOpen(true);
    }
    const profileMarker = parseOpenProfileModal(text);
    if (profileMarker.found) {
      triggered.add(lastMessage.id);
      const validMissing = profileMarker.missing.filter(isProfileField);
      // Empty list → ask the modal to render every field. The artisan can still
      // skip what he doesn't want to fill (only required-marked fields gate
      // the submit button).
      setProfileMissing(
        validMissing.length > 0 ? validMissing : ALL_PROFILE_FIELDS,
      );
      setProfileModalOpen(true);
    }
  }, [lastMessage]);

  // External callers (e.g. the legacy [PROFILE_BUTTON] CTA on /dashboard) can
  // pop the modal by dispatching this CustomEvent. Kept as a thin alternative
  // to the streaming marker so any surface can request profile completion.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ missing?: string[] }>).detail;
      const raw = Array.isArray(detail?.missing) ? detail.missing : [];
      const validMissing = raw.filter(isProfileField);
      setProfileMissing(
        validMissing.length > 0 ? validMissing : ALL_PROFILE_FIELDS,
      );
      setProfileModalOpen(true);
    }
    window.addEventListener("emile:open-profile-modal", handler);
    return () => {
      window.removeEventListener("emile:open-profile-modal", handler);
    };
  }, []);

  // Indices of assistant messages still followed by NO user message — the
  // ClientPicker buttons stay clickable only on those bubbles.
  const lastUserIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return i;
    }
    return -1;
  }, [messages]);

  const handlePickExistingClient = useCallback(() => {
    setClientSelectorOpen(true);
  }, []);

  const handlePickNewClient = useCallback(() => {
    setClientModalOpen(true);
  }, []);

  const handleClientSelected = useCallback(
    (client: ExistingClient) => {
      setClientSelectorOpen(false);
      const fullName =
        [client.first_name, client.name].filter(Boolean).join(" ").trim() ||
        client.name;
      const parts: string[] = [`Client sélectionné : ${fullName}`];
      if (client.email) parts.push(client.email);
      parts.push(`id:${client.id}`);
      void sendMessage(parts.join(" — "));
    },
    [sendMessage],
  );

  const handleClientSelectorClose = useCallback(() => {
    setClientSelectorOpen(false);
    void sendMessage("Sélection client annulée.");
  }, [sendMessage]);

  const handleClientCreated = useCallback(
    (client: CreatedClient) => {
      justHandledModalRef.current = true;
      const fullName =
        [client.first_name, client.name].filter(Boolean).join(" ").trim() ||
        client.name;
      const parts: string[] = [`Client créé : ${fullName}`];
      if (client.email) parts.push(client.email);
      if (client.type_client) parts.push(client.type_client);
      void sendMessage(parts.join(" — "));
    },
    [sendMessage],
  );

  const handleClientModalClose = useCallback(() => {
    setClientModalOpen(false);
    if (justHandledModalRef.current) {
      justHandledModalRef.current = false;
      return;
    }
    void sendMessage("Création client annulée.");
  }, [sendMessage]);

  const handleQuoteLineAdd = useCallback(
    (line: EmileQuoteLine) => {
      justHandledModalRef.current = true;
      const unit = line.unit ? ` ${line.unit}` : "";
      const tva = typeof line.tva === "number" ? ` (TVA ${line.tva}%)` : "";
      const text = `Ligne ajoutée : ${line.label} — ${line.quantity}${unit} × ${line.price} € HT${tva}.`;
      void sendMessage(text);
    },
    [sendMessage],
  );

  const handleQuoteLineModalClose = useCallback(() => {
    setQuoteLineModalOpen(false);
    if (justHandledModalRef.current) {
      justHandledModalRef.current = false;
      return;
    }
    void sendMessage("Ajout de ligne annulé.");
  }, [sendMessage]);

  const handleProfileCompleted = useCallback(
    (profile: ProfileUpdated) => {
      justHandledModalRef.current = true;
      // Summarise just enough so Émile can verbally confirm without re-reading
      // the whole row. The model will call refreshProfile() if it needs full
      // values (logo URL, IBAN, etc.).
      const parts: string[] = ["[SYSTEM] Profil complété"];
      const company =
        (profile.company_name as string | null | undefined) ??
        (profile.company as string | null | undefined);
      if (company) parts.push(`entreprise : ${company}`);
      if (profile.siret) parts.push(`SIRET ${profile.siret}`);
      if (profile.vat_status) parts.push(`TVA ${profile.vat_status}`);
      parts.push("Continue la création du devis.");
      void sendMessage(parts.join(" — "));
    },
    [sendMessage],
  );

  const handleProfileModalClose = useCallback(() => {
    setProfileModalOpen(false);
    if (justHandledModalRef.current) {
      justHandledModalRef.current = false;
      return;
    }
    void sendMessage(
      "[SYSTEM] Profil non complété — l'artisan a fermé la modale. Continue en utilisant le profil actuel et propose de compléter plus tard.",
    );
  }, [sendMessage]);

  // EmileInput hands us the raw clipboard content when a long paste is
  // detected. We stash it and open the structured editor. The modal owns the
  // submit + the [SYSTEM] notification back to Émile (via onImported).
  const handleBulkPaste = useCallback((rawText: string) => {
    setBulkRawText(rawText);
    setBulkImportOpen(true);
  }, []);

  const handleBulkImported = useCallback(
    (info: BulkImportSuccess) => {
      justHandledModalRef.current = true;
      // Push the new totals into the right-panel preview synchronously —
      // saveQuoteDraft would normally do this on the next assistant turn, but
      // bulk imports bypass the LLM so we forward the response directly.
      onQuoteUpdate?.({
        quoteId: info.quoteId,
        number: info.number,
        total: info.total,
      });
      const eur = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }).format(info.total);
      void sendMessage(
        `[SYSTEM] Devis ${info.number} enrichi de ${info.addedCount} ligne${
          info.addedCount > 1 ? "s" : ""
        } via import en masse (total ${info.totalLines} lignes, ${eur} HT). Reprends la main pour clarifier ou proposer la suite.`,
      );
    },
    [onQuoteUpdate, sendMessage],
  );

  const handleBulkImportClose = useCallback(() => {
    setBulkImportOpen(false);
    if (justHandledModalRef.current) {
      justHandledModalRef.current = false;
      return;
    }
    // Silent close — we don't want a "[SYSTEM] Import annulé" pill polluting
    // the thread for a flow the user may have triggered by accident.
  }, []);

  const activeToolName = useMemo(() => {
    if (!isLoading) return null;
    if (!lastMessage || lastMessage.role !== "assistant") return null;
    if (!Array.isArray(lastMessage.parts)) return null;
    for (const p of lastMessage.parts) {
      const type = (p as { type?: string }).type ?? "";
      if (type.startsWith("tool-") && type !== "tool-result") {
        return type.slice("tool-".length);
      }
    }
    return null;
  }, [isLoading, lastMessage]);

  // Hide the global "Émile écrit…" bubble as soon as the assistant has emitted
  // ANY visible content (text or a tool-call part) — the assistant bubble itself
  // takes over (with its own inline thinking dots for the tool-call case). This
  // matches the Apple/Claude.ai feel where the typing indicator vanishes the
  // instant the first chunk lands instead of lingering alongside the bubble.
  const showTypingIndicator = useMemo(() => {
    if (!isLoading) return false;
    if (!lastMessage) return true;
    if (lastMessage.role !== "assistant") return true;
    if (!Array.isArray(lastMessage.parts) || lastMessage.parts.length === 0) {
      return true;
    }
    return false;
  }, [isLoading, lastMessage]);

  // Dynamic placeholder for input
  const placeholder = isLoading
    ? "Émile rédige…"
    : messages.length === 0
      ? "Décris ton chantier à Émile…"
      : "Réponds à Émile…";

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        // scroll-behavior:auto (CSS) defeats any inherited "smooth" so each token
        // render can pin the viewport instantly. The JS path still asks for
        // smooth on settle via scrollIntoView({ behavior: "smooth" }). will-change
        // promotes the container to its own compositor layer so token-driven
        // reflows don't repaint the surrounding chrome.
        className="emile-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 [-webkit-overflow-scrolling:touch] [scroll-behavior:auto] [will-change:transform]"
      >
        {messages.length === 0 ? (
          <EmileEmptyState onSuggestion={sendMessage} />
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <EmileMessage
                key={msg.id}
                message={msg}
                onPickExistingClient={handlePickExistingClient}
                onPickNewClient={handlePickNewClient}
                pickerDisabled={idx < lastUserIndex}
              />
            ))}
            {showTypingIndicator && (
              <TypingIndicator activeToolName={activeToolName} />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {!pinnedToBottom && hasNew && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-28 right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg transition-transform hover:scale-105"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Nouveau message
        </button>
      )}

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <QuickReplies message={lastMessage} onSelect={sendMessage} />

      <EmileInput
        onSend={sendMessage}
        isLoading={isLoading}
        onAbort={abort}
        placeholder={placeholder}
        onBulkPaste={handleBulkPaste}
      />

      <NewClientModal
        open={clientModalOpen}
        onClose={handleClientModalClose}
        onCreated={handleClientCreated}
      />

      <NewQuoteLineModal
        open={quoteLineModalOpen}
        onClose={handleQuoteLineModalClose}
        onAdd={handleQuoteLineAdd}
      />

      <ClientSelectorModal
        open={clientSelectorOpen}
        onClose={handleClientSelectorClose}
        onSelect={handleClientSelected}
      />

      <ProfileCompletionModal
        open={profileModalOpen}
        missingFields={profileMissing}
        onClose={handleProfileModalClose}
        onCompleted={handleProfileCompleted}
      />

      <BulkImportModal
        open={bulkImportOpen}
        rawText={bulkRawText}
        conversationId={conversationId ?? null}
        onClose={handleBulkImportClose}
        onImported={handleBulkImported}
      />
    </div>
  );
}
