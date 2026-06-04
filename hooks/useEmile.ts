"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
} from "ai";

export interface EmileMessage extends UIMessage {
  id: string;
  role: "system" | "user" | "assistant";
  /**
   * ISO timestamp of when the message was sent. Set client-side for live
   * messages (user input + the assistant turn's start) and hydrated from
   * `messages.created_at` when a conversation is loaded from the DB. Optional
   * because the AI-SDK stream chunks don't carry it — we stamp it ourselves.
   * Used by the per-message action bar to show the "18:45" send time.
   */
  createdAt?: string;
}

// Flip via NEXT_PUBLIC_EMILE_DEBUG=1 to trace the full send flow in the
// browser console (clic → newConversation → fetch payload → first chunk →
// finish) plus EmileChat mount/unmount. Used to prove the "no response on the
// 1st message" remount bug; off in normal runs so production logs stay clean.
const EMILE_DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_EMILE_DEBUG === "1";

function dbg(...args: unknown[]): void {
  if (EMILE_DEBUG) {
    console.log(`[emile ${new Date().toISOString()}]`, ...args);
  }
}

// Timeout d'INACTIVITÉ du stream Émile : si aucun chunk n'arrive pendant ce
// délai (first-token compris), on abandonne proprement et on affiche un message
// + bouton Réessayer. Réarmé à chaque chunk → ne coupe pas une génération qui
// progresse. Garantit qu'il n'y a JAMAIS de spinner infini.
const EMILE_TIMEOUT_MS = 75_000;

// Messages d'erreur orientés utilisateur (pas de jargon HTTP/stack).
const EMILE_TIMEOUT_ERROR =
  "Émile met plus de temps que prévu. Réessaie ou reformule.";
const EMILE_GENERIC_ERROR =
  "Une erreur s'est produite, ton devis n'a pas été perdu. Réessaie.";

function lastTextOf(msgs: EmileMessage[]): string {
  const last = msgs[msgs.length - 1];
  if (!last || !Array.isArray(last.parts)) return "";
  return last.parts
    .filter((p) => (p as { type?: string }).type === "text")
    .map((p) => (p as { text?: string }).text ?? "")
    .join(" ")
    .slice(0, 60);
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  status: "active" | "archived";
  related_quote_id: string | null;
  related_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmileQuoteLine {
  id?: string;
  libelle?: string;
  label?: string;
  quantite?: number;
  quantity?: number;
  unite?: string | null;
  prixHT?: number;
  price?: number;
  tauxTVA?: number;
  tva?: number;
}

export interface EmileQuoteUpdateClient {
  id: string;
  name: string;
  first_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface EmileQuoteUpdate {
  quoteId?: string;
  number?: string;
  items?: EmileQuoteLine[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  validUntil?: string;
  /**
   * Optional client snapshot. Set when the update originates from a full quote
   * row (e.g. `loadConversation` hydrating the right panel) so EmileLayout can
   * display the client name without a separate fetch. Tool-emitted updates
   * (saveQuoteDraft) omit it — the previous client is kept.
   */
  client?: EmileQuoteUpdateClient | null;
  /**
   * Status snapshot from the DB row. Same hydration use-case as `client`.
   */
  status?: string;
}

export interface UseEmileOptions {
  conversationId?: string | null;
  onQuoteUpdate?: (quote: EmileQuoteUpdate) => void;
  onConversationCreated?: (id: string) => void;
}

export const EMILE_CONVERSATIONS_CHANGED_EVENT = "emile:conversations-changed";
export const EMILE_CONVERSATION_CREATED_EVENT = "emile:conversation-created";

function emitConversationsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EMILE_CONVERSATIONS_CHANGED_EVENT));
}

function emitConversationCreated(conversation: ConversationSummary): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EMILE_CONVERSATION_CREATED_EVENT, {
      detail: { conversation },
    }),
  );
}

export interface UseEmileResult {
  messages: EmileMessage[];
  isLoading: boolean;
  /**
   * `true` once the initial conversation (if any) has finished loading from the
   * DB. Used by callers that need to safely act on `messages` right after
   * mount — for example auto-sending a seed prompt for a freshly created
   * conversation without racing the load.
   */
  isHydrated: boolean;
  error: string | null;
  conversationId: string | null;
  sendMessage: (text: string) => Promise<void>;
  /**
   * Relance la dernière action après une erreur / un timeout, sans reperdre le
   * travail : on rejoue le dernier tour utilisateur. saveQuoteDraft réutilisant
   * le devis lié à la conversation, aucun doublon n'est créé.
   */
  retry: () => Promise<void>;
  /** Re-run the turn that produced the given assistant message (re-roll). */
  regenerate: (assistantMessageId: string) => Promise<void>;
  /** Replace a user message with new text and re-run from that point. */
  editAndResend: (userMessageId: string, newText: string) => Promise<void>;
  newConversation: (opts?: {
    title?: string;
    related_quote_id?: string;
    related_client_id?: string;
  }) => Promise<string | null>;
  loadConversation: (id: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

function userMessage(text: string): EmileMessage {
  return {
    id: makeId(),
    role: "user",
    parts: [{ type: "text", text }],
    createdAt: new Date().toISOString(),
  };
}

interface DbMessageRow {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls: unknown;
  tool_results: unknown;
  tool_call_id: string | null;
  created_at: string;
}

type AnyPart = Record<string, unknown>;

function dbMessageToUI(row: DbMessageRow): EmileMessage | null {
  if (row.role === "tool") return null;
  const role: "user" | "assistant" | "system" =
    row.role === "system" ? "system" : row.role;

  const parts: AnyPart[] = [];

  // Assistant turns persist their tool activity as JSONB on the row. Rebuild
  // each call as an AI-SDK tool part in `output-available` state so when this
  // conversation resumes (refresh, share link, switch back), the model sees
  // the same history as during the live stream. Without this, Émile reloads
  // the thread, forgets he already saved the devis, and either re-runs
  // saveQuoteDraft or creates a 2nd quote — violating his own "1 conversation
  // = 1 devis" rule.
  if (role === "assistant") {
    const calls = Array.isArray(row.tool_calls)
      ? (row.tool_calls as AnyPart[])
      : [];
    const results = Array.isArray(row.tool_results)
      ? (row.tool_results as AnyPart[])
      : [];
    const resultByCallId = new Map<string, AnyPart>();
    for (const r of results) {
      const id = r.toolCallId as string | undefined;
      if (id) resultByCallId.set(id, r);
    }
    for (const call of calls) {
      const toolName = (call.toolName as string | undefined) ?? "unknown";
      const toolCallId =
        (call.toolCallId as string | undefined) ?? makeId();
      const input = (call.input ?? call.args ?? {}) as AnyPart;
      const matched = resultByCallId.get(toolCallId);
      const output = matched
        ? ((matched.output ?? matched.result ?? null) as unknown)
        : null;
      parts.push({
        type: `tool-${toolName}`,
        toolCallId,
        input,
        output,
        state: matched ? "output-available" : "input-available",
      });
    }
  }

  if (row.content) {
    parts.push({ type: "text", text: row.content });
  }

  // Defensive: every UI message must carry a non-empty id so React keys and any
  // future per-message logic stay collision-free. DB rows have UUIDs in
  // practice, but we mint a fallback rather than trust the wire.
  return {
    id: row.id || makeId(),
    role,
    parts: parts as EmileMessage["parts"],
    createdAt: row.created_at,
  };
}

function parseToolOutput(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

function extractQuoteUpdate(
  msg: EmileMessage,
): EmileQuoteUpdate | null {
  if (!Array.isArray(msg.parts)) return null;
  for (const part of msg.parts) {
    const anyPart = part as Record<string, unknown>;
    const type = anyPart.type as string | undefined;
    if (!type) continue;
    const isSave =
      type === "tool-saveQuoteDraft" ||
      (anyPart.toolName as string | undefined) === "saveQuoteDraft";
    if (!isSave) continue;
    const output = parseToolOutput(anyPart.output ?? anyPart.result);
    if (!output) continue;
    if (output.ok === false) continue;
    return output as EmileQuoteUpdate;
  }
  return null;
}

function quoteRowToUpdate(row: Record<string, unknown>): EmileQuoteUpdate {
  // Items: same back-compat mapping as before — emit both canonical and
  // saveQuoteDraft-style keys so any downstream alias-aware reader keeps
  // working.
  const items = Array.isArray(row.items)
    ? (row.items as Array<Record<string, unknown>>).map((it) => ({
        id: typeof it.id === "string" ? it.id : undefined,
        label:
          typeof it.label === "string"
            ? it.label
            : typeof it.description === "string"
              ? (it.description as string)
              : undefined,
        libelle:
          typeof it.label === "string"
            ? it.label
            : typeof it.description === "string"
              ? (it.description as string)
              : undefined,
        price: Number(it.price ?? it.unitPrice ?? 0),
        prixHT: Number(it.price ?? it.unitPrice ?? 0),
        quantity: Number(it.quantity ?? 1),
        quantite: Number(it.quantity ?? 1),
        unite: (it.unite as string | null | undefined) ?? null,
        tva: typeof it.tva === "number" ? it.tva : undefined,
        tauxTVA: typeof it.tva === "number" ? it.tva : undefined,
      }))
    : [];

  // The /api/quotes/[id] GET embeds the client via `client:clients(*)` so a
  // hydrated row gives us name/email/etc. for free.
  const rawClient = row.client as Record<string, unknown> | null | undefined;
  const client: EmileQuoteUpdateClient | undefined =
    rawClient && typeof rawClient === "object"
      ? {
          id: String(rawClient.id ?? ""),
          name: String(rawClient.name ?? "Client"),
          first_name: (rawClient.first_name as string | null) ?? null,
          email: (rawClient.email as string | null) ?? null,
          phone: (rawClient.phone as string | null) ?? null,
        }
      : undefined;

  return {
    quoteId: row.id as string | undefined,
    number: row.number as string | undefined,
    items,
    subtotal: Number(row.subtotal ?? 0),
    taxRate: Number(row.tax_rate ?? 20),
    taxAmount: Number(row.tax_amount ?? 0),
    total: Number(row.total ?? 0),
    validUntil:
      typeof row.valid_until === "string" ? row.valid_until : undefined,
    client,
    status: typeof row.status === "string" ? row.status : undefined,
  };
}

export function useEmile(
  options: UseEmileOptions = {},
): UseEmileResult {
  const {
    conversationId: initialConversationId,
    onQuoteUpdate,
    onConversationCreated,
  } = options;

  const [messages, setMessages] = useState<EmileMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  // No conversation to fetch → consider the hook hydrated immediately.
  const [isHydrated, setIsHydrated] = useState(!initialConversationId);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Garde de ré-entrée SYNCHRONE : `isLoading` est un state asynchrone, donc une
  // 2e action déclenchée pendant la fenêtre `await newConversation()` (avant que
  // isLoading passe à true) pourrait se faufiler. Ce ref bloque toute action
  // concurrente dès le 1er tick.
  const inFlightRef = useRef(false);
  const onQuoteUpdateRef = useRef(onQuoteUpdate);
  const onConversationCreatedRef = useRef(onConversationCreated);
  useEffect(() => {
    onQuoteUpdateRef.current = onQuoteUpdate;
  }, [onQuoteUpdate]);
  useEffect(() => {
    onConversationCreatedRef.current = onConversationCreated;
  }, [onConversationCreated]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, [abort]);

  const newConversation = useCallback(
    async (opts?: {
      title?: string;
      related_quote_id?: string;
      related_client_id?: string;
    }) => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(opts ?? {}),
        });
        if (!res.ok) {
          setError(`Création conversation: HTTP ${res.status}`);
          return null;
        }
        const json = (await res.json()) as {
          conversation: ConversationSummary;
        };
        setConversationId(json.conversation.id);
        setMessages([]);
        emitConversationCreated(json.conversation);
        emitConversationsChanged();
        onConversationCreatedRef.current?.(json.conversation.id);
        return json.conversation.id;
      } catch (e) {
        setError((e as Error).message ?? "Erreur réseau");
        return null;
      }
    },
    [],
  );

  const loadConversation = useCallback(async (id: string) => {
    // Abort any in-flight stream BEFORE swapping conversations. Otherwise the
    // previous fetch keeps running, lands its assistant message into
    // setMessages (now bound to the new conv) and its server-side onFinish
    // persists to the OLD conv — split-brain state on refresh (bug C2).
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setIsHydrated(false);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) {
        setError(`Chargement conversation: HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as {
        conversation: ConversationSummary;
        messages: DbMessageRow[];
      };
      setConversationId(json.conversation.id);
      const ui = json.messages
        .map(dbMessageToUI)
        .filter((m): m is EmileMessage => m !== null);
      setMessages(ui);

      // Hydrate the right-panel quote from the conversation's linked quote.
      if (json.conversation.related_quote_id && onQuoteUpdateRef.current) {
        try {
          const qRes = await fetch(
            `/api/quotes/${json.conversation.related_quote_id}`,
          );
          if (qRes.ok) {
            const qJson = (await qRes.json()) as {
              quote: Record<string, unknown>;
            };
            if (qJson.quote) {
              onQuoteUpdateRef.current(quoteRowToUpdate(qJson.quote));
            }
          }
        } catch {
          // best-effort: panel reload should never break the conversation load
        }
      }
    } catch (e) {
      setError((e as Error).message ?? "Erreur réseau");
    } finally {
      // Flip hydrated even on failure so callers (e.g. auto-seed) aren't stuck
      // waiting forever. They can still gate on `messages.length` / `error`.
      setIsHydrated(true);
    }
  }, []);

  // Shared streaming core: POST `baseMessages` to /api/emile/chat and fold the
  // SSE chunks into a single assistant bubble. `baseMessages` is the EXACT
  // history sent to the model and must already be in `messages` (the caller
  // sets it before calling). Used by sendMessage, regenerate and editAndResend
  // so the three share one code path and one set of streaming invariants.
  const streamAssistant = useCallback(
    async (baseMessages: EmileMessage[], convId: string) => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setIsLoading(true);

      // Anti-spinner-infini : timeout d'inactivité réarmé à chaque chunk.
      let timedOut = false;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      const armIdleTimeout = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          timedOut = true;
          ctrl.abort();
        }, EMILE_TIMEOUT_MS);
      };
      armIdleTimeout();

      // Stamp the assistant turn's start once; reused across every chunk so the
      // bubble's timestamp stays stable while tokens stream in.
      const turnStartedAt = new Date().toISOString();
      dbg("fetch /api/emile/chat", {
        convId,
        count: baseMessages.length,
        lastText: lastTextOf(baseMessages),
      });

      try {
        const res = await fetch("/api/emile/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: baseMessages,
            conversationId: convId,
          }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          setError(EMILE_GENERIC_ERROR);
          return;
        }

        const chunkStream = parseJsonEventStream({
          stream: res.body,
          schema: uiMessageChunkSchema,
        });

        const filtered = new ReadableStream({
          async start(controller) {
            const reader = chunkStream.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value && value.success) {
                  controller.enqueue(value.value);
                }
              }
            } finally {
              controller.close();
              reader.releaseLock();
            }
          },
        });

        // readUIMessageStream emits assistant messages with id="" on every yield
        // (AI SDK v6 behaviour). Matching by id would collide across turns and
        // overwrite the previous assistant bubble. We mint a per-turn id and
        // track the bubble's slot index explicitly — never via findIndex(id).
        const turnAssistantId = makeId();
        let assistantBubbleIndex: number | null = null;
        let sawChunk = false;

        for await (const ui of readUIMessageStream({
          stream: filtered,
          onError: (e) => setError((e as Error).message ?? "Erreur stream"),
        })) {
          // Chunk reçu → le stream progresse, on réarme le timeout d'inactivité.
          armIdleTimeout();
          if (!sawChunk) {
            sawChunk = true;
            dbg("first assistant chunk");
          }
          const uiMsg = ui as EmileMessage;
          const stableMsg: EmileMessage = {
            ...uiMsg,
            id: uiMsg.id || turnAssistantId,
            createdAt: turnStartedAt,
          };
          setMessages((prev) => {
            if (assistantBubbleIndex === null) {
              const next = [...prev, stableMsg];
              assistantBubbleIndex = next.length - 1;
              return next;
            }
            const next = [...prev];
            next[assistantBubbleIndex] = stableMsg;
            return next;
          });

          const quote = extractQuoteUpdate(stableMsg);
          if (quote && onQuoteUpdateRef.current) {
            onQuoteUpdateRef.current(quote);
            // The server auto-names the conversation when the draft is saved with
            // a client + a prestation. Refresh the sidebar so the new title shows.
            emitConversationsChanged();
          }
        }
      } catch (e) {
        // timedOut a priorité : c'est nous qui avons abort() sur inactivité.
        if (timedOut) {
          setError(EMILE_TIMEOUT_ERROR);
        } else if ((e as Error).name !== "AbortError") {
          // Une vraie erreur (réseau/serveur). Un AbortError "normal" (stop
          // utilisateur / changement de conversation) reste silencieux.
          setError(EMILE_GENERIC_ERROR);
        }
      } finally {
        if (idleTimer) clearTimeout(idleTimer);
        abortRef.current = null;
        setIsLoading(false);
        dbg("stream finished");
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      // Garde de ré-entrée synchrone : ignore proprement toute 2e action tant
      // qu'une est en cours (pas de 2e requête concurrente).
      if (!trimmed || isLoading || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        setError(null);
        dbg("sendMessage", {
          text: trimmed.slice(0, 40),
          conversationId,
        });

        let convId = conversationId;
        if (!convId) {
          convId = await newConversation();
          dbg("newConversation resolved", { convId });
          if (!convId) return;
        }

        const userMsg = userMessage(trimmed);
        const baseMessages: EmileMessage[] = [...messages, userMsg];
        setMessages(baseMessages);
        await streamAssistant(baseMessages, convId);
      } finally {
        inFlightRef.current = false;
      }
    },
    [conversationId, isLoading, messages, newConversation, streamAssistant],
  );

  // Relance le dernier tour utilisateur après une erreur/timeout. On retire un
  // éventuel bubble assistant partiel en queue puis on rejoue depuis le dernier
  // message utilisateur — le travail (lignes déjà saisies) n'est pas perdu, et
  // saveQuoteDraft réutilise le devis de la conversation (pas de doublon).
  const retry = useCallback(async () => {
    if (isLoading || inFlightRef.current || !conversationId) return;
    let baseMessages = messages;
    while (
      baseMessages.length > 0 &&
      baseMessages[baseMessages.length - 1].role !== "user"
    ) {
      baseMessages = baseMessages.slice(0, -1);
    }
    if (baseMessages.length === 0) return;
    inFlightRef.current = true;
    try {
      setError(null);
      setMessages(baseMessages);
      await streamAssistant(baseMessages, conversationId);
    } finally {
      inFlightRef.current = false;
    }
  }, [conversationId, isLoading, messages, streamAssistant]);

  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      if (isLoading || inFlightRef.current || !conversationId) return;
      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      if (idx === -1) return;
      // Keep everything up to (but not including) this assistant message, then
      // trim back to the preceding user turn so the slice is a valid prompt.
      let baseMessages = messages.slice(0, idx);
      while (
        baseMessages.length > 0 &&
        baseMessages[baseMessages.length - 1].role !== "user"
      ) {
        baseMessages = baseMessages.slice(0, -1);
      }
      if (baseMessages.length === 0) return;
      inFlightRef.current = true;
      try {
        setError(null);
        setMessages(baseMessages);
        await streamAssistant(baseMessages, conversationId);
      } finally {
        inFlightRef.current = false;
      }
    },
    [conversationId, isLoading, messages, streamAssistant],
  );

  const editAndResend = useCallback(
    async (userMessageId: string, newText: string) => {
      if (isLoading || inFlightRef.current) return;
      const trimmed = newText.trim();
      if (!trimmed) return;
      inFlightRef.current = true;
      try {
        let convId = conversationId;
        if (!convId) {
          convId = await newConversation();
          if (!convId) return;
        }

        const idx = messages.findIndex((m) => m.id === userMessageId);
        if (idx === -1) return;
        // Drop the edited user message and everything after it, then re-send the
        // edited text as a fresh user turn.
        const history = messages.slice(0, idx);
        const userMsg = userMessage(trimmed);
        const baseMessages: EmileMessage[] = [...history, userMsg];
        setError(null);
        setMessages(baseMessages);
        await streamAssistant(baseMessages, convId);
      } finally {
        inFlightRef.current = false;
      }
    },
    [conversationId, isLoading, messages, newConversation, streamAssistant],
  );

  return {
    messages,
    isLoading,
    isHydrated,
    error,
    conversationId,
    sendMessage,
    retry,
    regenerate,
    editAndResend,
    newConversation,
    loadConversation,
    abort,
    reset,
  };
}

// ─── Conversations hook (sidebar) ────────────────────────────────────────────

export interface UseConversationsResult {
  conversations: ConversationSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  rename: (id: string, title: string) => Promise<boolean>;
  archive: (id: string) => Promise<boolean>;
  unarchive: (id: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export function useConversations(): UseConversationsResult {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as {
        conversations: ConversationSummary[];
      };
      setConversations(json.conversations);
    } catch (e) {
      setError((e as Error).message ?? "Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      void refresh();
    };
    const created = (e: Event) => {
      const detail = (e as CustomEvent<{ conversation?: ConversationSummary }>)
        .detail;
      const conv = detail?.conversation;
      if (!conv) return;
      setConversations((prev) => {
        if (prev.some((c) => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
    };
    window.addEventListener(EMILE_CONVERSATIONS_CHANGED_EVENT, handler);
    window.addEventListener(EMILE_CONVERSATION_CREATED_EVENT, created);
    return () => {
      window.removeEventListener(EMILE_CONVERSATIONS_CHANGED_EVENT, handler);
      window.removeEventListener(EMILE_CONVERSATION_CREATED_EVENT, created);
    };
  }, [refresh]);

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh],
  );

  const rename = useCallback(
    (id: string, title: string) => patch(id, { title }),
    [patch],
  );
  const archive = useCallback(
    (id: string) => patch(id, { status: "archived" }),
    [patch],
  );
  const unarchive = useCallback(
    (id: string) => patch(id, { status: "active" }),
    [patch],
  );
  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh],
  );

  return {
    conversations,
    isLoading,
    error,
    refresh,
    rename,
    archive,
    unarchive,
    remove,
  };
}
