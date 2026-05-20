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

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setError(null);

      let convId = conversationId;
      if (!convId) {
        convId = await newConversation();
        if (!convId) return;
      }

      const userMsg = userMessage(trimmed);
      const baseMessages: EmileMessage[] = [...messages, userMsg];
      setMessages(baseMessages);

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setIsLoading(true);

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
          setError(`Chat: HTTP ${res.status}`);
          setIsLoading(false);
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

        for await (const ui of readUIMessageStream({
          stream: filtered,
          onError: (e) => setError((e as Error).message ?? "Erreur stream"),
        })) {
          const uiMsg = ui as EmileMessage;
          const stableMsg: EmileMessage = {
            ...uiMsg,
            id: uiMsg.id || turnAssistantId,
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
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message ?? "Erreur stream");
        }
      } finally {
        abortRef.current = null;
        setIsLoading(false);
      }
    },
    [conversationId, isLoading, messages, newConversation],
  );

  return {
    messages,
    isLoading,
    isHydrated,
    error,
    conversationId,
    sendMessage,
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
