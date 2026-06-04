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
  parseOpenClientEditModal,
  parseOpenProfileModal,
} from "./QuickReplies";
import { EmileInput } from "./EmileInput";
import { EmileEmptyState } from "./EmileEmptyState";
import {
  NewClientModal,
  type CreatedClient,
  type EditClientInitial,
} from "./NewClientModal";
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
import { SignatureModal } from "./SignatureModal";
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
  /** Live snapshot of the right-panel quote so the BulkImportModal can show
   *  the "X lignes déjà sur le devis" pre-step without an extra round-trip. */
  activeQuoteLineCount?: number;
  activeQuoteNumber?: string | null;
}

const NEAR_BOTTOM_PX = 100;

export function EmileChat({
  conversationId,
  onQuoteUpdate,
  onConversationCreated,
  activeQuoteLineCount = 0,
  activeQuoteNumber,
}: EmileChatProps) {
  const {
    messages,
    isLoading,
    isHydrated,
    error,
    sendMessage,
    retry,
    regenerate,
    editAndResend,
    loadConversation,
    abort,
  } = useEmile({ conversationId, onQuoteUpdate, onConversationCreated });

  // Debug (NEXT_PUBLIC_EMILE_DEBUG=1): a MOUNT followed by an UNMOUNT around a
  // single first send is the fingerprint of the remount bug; a lone MOUNT that
  // survives the whole turn means the history.replaceState fix held.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EMILE_DEBUG !== "1") return;
    const ts = () => new Date().toISOString();
    console.log(`[emile-chat ${ts()}] MOUNT`, { conversationId });
    return () => {
      console.log(`[emile-chat ${ts()}] UNMOUNT`, { conversationId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startParam = searchParams?.get("start") ?? null;
  const autoSeededRef = useRef<string | null>(null);
  // Empêche la ré-ouverture d'une modale (profil, ligne, signature…) à partir
  // d'un marker PERSISTÉ dans l'historique : à la 1re passe après (re)chargement
  // d'une conversation, on neutralise tous les messages déjà présents ; seules
  // les réponses LIVE d'Émile peuvent ensuite ouvrir une modale. Sans ça, une
  // conversation dont le dernier message porte [OPEN_PROFILE_MODAL] rouvrait une
  // modale plein écran à CHAQUE chargement, masquant la barre de saisie.
  const autoOpenArmedRef = useRef<string | null>(null);

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
  // Edit-client flow triggered by sendQuote's client_incomplete branch.
  // `initial` is fetched from /api/clients/[id] before we open the modal so
  // the existing values pre-fill and the artisan only has to add what's
  // missing (highlighted via `missing`).
  const [editClientInitial, setEditClientInitial] =
    useState<EditClientInitial | null>(null);
  const [editClientMissing, setEditClientMissing] = useState<string[]>([]);
  const [editClientOpen, setEditClientOpen] = useState(false);
  // Signature artisan flow. Opened either by a tool result carrying
  // action="open_signature_modal" (sendQuote → missing_signature branch or an
  // explicit openSignatureModal tool call) or by Émile pinging it for a
  // refresh. `signatureExistingUrl` switches the modal to edit mode.
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureExistingUrl, setSignatureExistingUrl] = useState<
    string | null
  >(null);

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
    setEditClientOpen(false);
    setSignatureModalOpen(false);
    setSignatureExistingUrl(null);
    setEditClientInitial(null);
    setEditClientMissing([]);
    autoSeededRef.current = null;
    autoOpenArmedRef.current = null;
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
    // CRITIQUE — n'agir qu'une fois l'HISTORIQUE chargé (isHydrated). Sinon on
    // armerait trop tôt (sur une liste vide ou l'ancienne conversation) puis,
    // quand l'historique arrive ~1s plus tard, le dernier message porteur d'un
    // marker rouvrirait sa modale plein écran et masquerait la barre de saisie.
    if (!isHydrated) return;
    // 1re passe APRÈS hydratation : on marque TOUS les messages déjà présents
    // (l'historique complet) comme "déjà traités" pour qu'AUCUN marker de
    // l'historique — quel qu'il soit (profil, ligne, client, signature) — ne
    // puisse rouvrir une modale au chargement. Seules les réponses LIVE
    // suivantes (nouveaux ids absents du set) déclenchent une modale.
    if (autoOpenArmedRef.current !== (conversationId ?? "")) {
      for (const m of messages) {
        if (m.id) triggeredModalIdsRef.current.add(m.id);
      }
      autoOpenArmedRef.current = conversationId ?? "";
      return;
    }
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
    const clientEditMarker = parseOpenClientEditModal(text);
    if (clientEditMarker.found && clientEditMarker.clientId) {
      triggered.add(lastMessage.id);
      const clientId = clientEditMarker.clientId;
      const missing = clientEditMarker.missing;
      // Pre-fetch the row so the modal opens already populated. Failing the
      // fetch is non-fatal — we toast + skip silently rather than open a
      // blank modal that would confuse the artisan into rewriting from
      // scratch (and losing the row's email/phone/SIRET).
      void fetch(`/api/clients/${clientId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((json: { client: EditClientInitial }) => {
          setEditClientInitial(json.client);
          setEditClientMissing(missing);
          setEditClientOpen(true);
        })
        .catch((err) => {
          console.error("[OPEN_CLIENT_EDIT_MODAL] fetch failed", err);
        });
    }

    // Signature modal trigger — purely action-based (no text marker). We scan
    // tool result parts for action="open_signature_modal" so either the
    // openSignatureModal tool OR sendQuote's missing_signature branch can
    // fire it. We also dedupe via the message id so streaming re-renders
    // don't reopen on every chunk. Fetching the existing signature_url lets
    // the modal default to edit mode when the artisan asked to re-sign vs.
    // first-time onboarding.
    if (Array.isArray(lastMessage.parts)) {
      const wantsSignatureModal = lastMessage.parts.some((p) => {
        const part = p as {
          type?: string;
          state?: string;
          output?: { action?: string } | null;
        };
        if (!part.type || !part.type.startsWith("tool-")) return false;
        if (part.state !== "output-available") return false;
        return (
          part.output != null &&
          typeof part.output === "object" &&
          (part.output as { action?: string }).action === "open_signature_modal"
        );
      });
      if (wantsSignatureModal) {
        triggered.add(lastMessage.id);
        void fetch("/api/profile/signature")
          .then((res) => (res.ok ? res.json() : Promise.reject(res)))
          .then((json: { signature_url: string | null }) => {
            setSignatureExistingUrl(json.signature_url ?? null);
            setSignatureModalOpen(true);
          })
          .catch((err) => {
            console.error("[open_signature_modal] fetch failed", err);
            // Open in first-time mode if the GET failed — better than
            // leaving the artisan stuck mid-send with no UI surfacing.
            setSignatureExistingUrl(null);
            setSignatureModalOpen(true);
          });
      }
    }
  }, [lastMessage, conversationId, messages, isHydrated]);

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
      // Write the link to the conversation IMMEDIATELY (fire-and-forget),
      // independent of whether Émile then calls saveQuoteDraft. Without
      // this, a user who picked a client and ran a bulk import a second
      // later landed in the bulk-lines route before Émile had time to
      // tag the conversation, and the import lost the client linkage.
      if (conversationId) {
        void fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ related_client_id: client.id }),
        }).catch((err) => {
          console.warn("[handleClientSelected] PATCH failed", err);
        });
      }
      const fullName =
        [client.first_name, client.name].filter(Boolean).join(" ").trim() ||
        client.name;
      // Instant panel sync: surface the FULL client in the right panel the
      // moment it's picked, instead of waiting for Émile's saveQuoteDraft turn
      // (which used to be the only thing that populated it → "syncs late").
      onQuoteUpdate?.({
        client: {
          id: client.id,
          name: client.name,
          first_name: client.first_name ?? null,
          email: client.email ?? null,
        },
      });
      // [SYSTEM] prefix → renders as a discreet system pill (not a violet user
      // bubble); EmileMessage also strips the technical id from the display.
      const parts: string[] = [`[SYSTEM] Client sélectionné : ${fullName}`];
      if (client.email) parts.push(client.email);
      parts.push(`id:${client.id}`);
      void sendMessage(parts.join(" — "));
    },
    [sendMessage, conversationId, onQuoteUpdate],
  );

  const handleClientSelectorClose = useCallback(() => {
    setClientSelectorOpen(false);
    void sendMessage("[SYSTEM] Sélection client annulée.");
  }, [sendMessage]);

  const handleClientCreated = useCallback(
    (client: CreatedClient) => {
      justHandledModalRef.current = true;
      // Same fire-and-forget link as handleClientSelected so a bulk import
      // following a NewClientModal close inherits the freshly created row
      // without waiting for Émile's saveQuoteDraft turn.
      if (conversationId) {
        void fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ related_client_id: client.id }),
        }).catch((err) => {
          console.warn("[handleClientCreated] PATCH failed", err);
        });
      }
      const fullName =
        [client.first_name, client.name].filter(Boolean).join(" ").trim() ||
        client.name;
      // Same instant panel sync as the existing-client path.
      onQuoteUpdate?.({
        client: {
          id: client.id,
          name: client.name,
          first_name: client.first_name ?? null,
          email: client.email ?? null,
        },
      });
      const parts: string[] = [`[SYSTEM] Client créé : ${fullName}`];
      if (client.email) parts.push(client.email);
      if (client.type_client) parts.push(client.type_client);
      void sendMessage(parts.join(" — "));
    },
    [sendMessage, conversationId, onQuoteUpdate],
  );

  const handleClientModalClose = useCallback(() => {
    setClientModalOpen(false);
    if (justHandledModalRef.current) {
      justHandledModalRef.current = false;
      return;
    }
    void sendMessage("[SYSTEM] Création client annulée.");
  }, [sendMessage]);

  const handleQuoteLineAdd = useCallback(
    (line: EmileQuoteLine) => {
      justHandledModalRef.current = true;
      const unit = line.unit ? ` ${line.unit}` : "";
      const tva = typeof line.tva === "number" ? ` (TVA ${line.tva}%)` : "";
      const text = `[SYSTEM] Ligne ajoutée : ${line.label} — ${line.quantity}${unit} × ${line.price} € HT${tva}.`;
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
    void sendMessage("[SYSTEM] Ajout de ligne annulé.");
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
      // Push the new totals AND items into the right-panel preview
      // synchronously — saveQuoteDraft would normally do this on the next
      // assistant turn, but bulk imports bypass the LLM so we forward the
      // response directly. Forwarding items prevents the panel from showing
      // "0 lignes" right after a successful import, which previously lured
      // users into re-adding lines manually (and wiping the DB rows via
      // persistQuote with an empty lines array).
      onQuoteUpdate?.({
        quoteId: info.quoteId,
        number: info.number,
        total: info.total,
        items: info.items,
        // Forward the client snapshot so a mode="new" import that inherited
        // the conversation's client renders the name immediately. `undefined`
        // (modes that don't return a client) keeps the previous client in the
        // panel via updateToDraft's fallback.
        ...(info.client !== undefined ? { client: info.client } : {}),
      });
      const eur = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }).format(info.total);
      // Mode-aware [SYSTEM] notification so Émile knows whether the existing
      // lines were preserved, overwritten, or sit on a separate (older) draft.
      const pluralS = info.totalLines > 1 ? "s" : "";
      const sysBody =
        info.mode === "replace"
          ? `Devis ${info.number} reconstruit via import en masse — anciennes lignes effacées, ${info.totalLines} ligne${pluralS} au total (${eur} HT)`
          : info.mode === "new"
            ? `Nouveau devis ${info.number} créé via import en masse — ${info.totalLines} ligne${pluralS} (${eur} HT)`
            : `Devis ${info.number} enrichi de ${info.addedCount} ligne${info.addedCount > 1 ? "s" : ""} via import en masse (total ${info.totalLines} ligne${pluralS}, ${eur} HT)`;
      void sendMessage(
        `[SYSTEM] ${sysBody}. Reprends la main pour clarifier ou proposer la suite.`,
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

  const handleEditClientSaved = useCallback(
    (client: CreatedClient) => {
      justHandledModalRef.current = true;
      const fullName =
        [client.first_name, client.name].filter(Boolean).join(" ").trim() ||
        client.name;
      // [SYSTEM] message so Émile knows it can retry sendQuote.
      void sendMessage(
        `[SYSTEM] Client mis à jour — ${fullName} — id:${client.id}. Reprends l'envoi du devis.`,
      );
    },
    [sendMessage],
  );

  const handleSignatureSaved = useCallback(() => {
    justHandledModalRef.current = true;
    setSignatureModalOpen(false);
    setSignatureExistingUrl(null);
    // [SYSTEM] pill — matches the wording the system prompt instructs
    // Émile to wait for before re-trying sendQuote. The URL itself isn't
    // forwarded; the model will pull it on the next sendQuote attempt.
    void sendMessage(
      "[SYSTEM] Signature enregistrée. Reprends l'envoi du devis.",
    );
  }, [sendMessage]);

  const handleSignatureClose = useCallback(() => {
    setSignatureModalOpen(false);
    setSignatureExistingUrl(null);
    if (justHandledModalRef.current) {
      justHandledModalRef.current = false;
      return;
    }
    // Silent cancel — Émile already knows the flow ended without a save
    // because no [SYSTEM] Signature enregistrée will come; on the next
    // sendQuote call the missing_signature branch fires again.
    void sendMessage(
      "[SYSTEM] Signature annulée. L'artisan n'a pas validé la signature, demande-lui s'il veut réessayer ou abandonner l'envoi.",
    );
  }, [sendMessage]);

  const handleEditClientClose = useCallback(() => {
    setEditClientOpen(false);
    if (justHandledModalRef.current) {
      justHandledModalRef.current = false;
      setEditClientInitial(null);
      setEditClientMissing([]);
      return;
    }
    setEditClientInitial(null);
    setEditClientMissing([]);
    void sendMessage(
      "[SYSTEM] Mise à jour client annulée. Demande à l'artisan s'il veut compléter ces infos ou renoncer à l'envoi.",
    );
  }, [sendMessage]);

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
                onRegenerate={regenerate}
                onEdit={editAndResend}
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
        <div className="flex items-center justify-between gap-3 border-t border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">
          <span className="min-w-0">{error}</span>
          {!isLoading && (
            <button
              type="button"
              onClick={() => void retry()}
              className="shrink-0 rounded-full border border-red-300 bg-white px-3 py-1 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      <QuickReplies
        message={lastMessage}
        onSelect={sendMessage}
        disabled={isLoading}
      />

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
        existingItemCount={activeQuoteLineCount}
        existingQuoteNumber={activeQuoteNumber ?? null}
        onClose={handleBulkImportClose}
        onImported={handleBulkImported}
      />

      <NewClientModal
        open={editClientOpen}
        initialData={editClientInitial}
        missingFields={editClientMissing}
        onClose={handleEditClientClose}
        onCreated={handleEditClientSaved}
      />

      <SignatureModal
        open={signatureModalOpen}
        existingSignatureUrl={signatureExistingUrl}
        onClose={handleSignatureClose}
        onSaved={handleSignatureSaved}
      />
    </div>
  );
}
