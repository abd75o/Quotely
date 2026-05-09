"use client";

import { useCallback, useRef, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { QuotePreview } from "./QuotePreview";
import type {
  AgentAction,
  Message,
  MessageEmbed,
  QuoteDraft,
  QuoteLine,
  RedacteurClient,
} from "./types";

interface ChatLayoutProps {
  initialMessages: Message[];
  recentClients: RedacteurClient[];
  allClients: RedacteurClient[];
  conversationId: string | null;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Salut ! Qu'est-ce que tu veux faire ?",
  embed: {
    type: "choice_buttons",
    choices: [
      { label: "Faire un devis", action: "start_quote" },
      { label: "Ajouter un client", action: "start_new_client" },
    ],
  },
};

interface PreviewQuotePayload {
  id: string;
  number: string;
  status: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  date: string;
  validity: number;
  tva: number;
  lines: { id: string; label: string; price: number; quantity: number }[];
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function previewToDraft(p: PreviewQuotePayload): QuoteDraft {
  const status: QuoteDraft["status"] =
    p.status === "draft"
      ? "draft"
      : p.status === "pending"
        ? "validated"
        : "sent";
  const client: RedacteurClient = p.client
    ? {
        id: p.client.id,
        name: p.client.name,
        email: p.client.email,
        phone: p.client.phone,
      }
    : { id: "", name: "Client inconnu", email: null, phone: null };
  const lines: QuoteLine[] = p.lines.map((l) => ({
    id: l.id,
    label: l.quantity > 1 ? `${l.label} (×${l.quantity})` : l.label,
    price: Number(l.price) * Number(l.quantity || 1),
  }));
  return {
    number: p.number,
    client,
    date: p.date,
    validity: p.validity,
    tva: p.tva,
    lines,
    status,
  };
}

export function ChatLayout({
  initialMessages,
  recentClients,
  allClients,
  conversationId: initialConversationId,
}: ChatLayoutProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0 ? initialMessages : [WELCOME],
  );
  const [thinking, setThinking] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<QuoteDraft | null>(null);
  const [sending, setSending] = useState(false);
  const conversationIdRef = useRef<string | null>(initialConversationId);

  const flash = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: newId("flash"), role: "system_flash", content },
    ]);
  }, []);

  const buildHistoryForApi = useCallback(
    (msgs: Message[]) =>
      msgs
        .filter((m) => m.role === "user" || m.role === "assistant")
        .filter((m) => typeof m.content === "string" && m.content.length > 0)
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content ?? "" })),
    [],
  );

  const streamRequest = useCallback(
    async (userText: string) => {
      const userMsg: Message = {
        id: newId("user"),
        role: "user",
        content: userText,
      };
      const assistantId = newId("a");
      const assistantPlaceholder: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      let history: ReturnType<typeof buildHistoryForApi> = [];
      setMessages((prev) => {
        history = buildHistoryForApi(prev);
        return [...prev, userMsg, assistantPlaceholder];
      });
      setThinking(true);
      setSending(true);

      try {
        const res = await fetch("/api/redacteur/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
            messages: history,
            userMessage: userText,
          }),
        });

        if (!res.ok || !res.body) {
          const errorText = await res.text().catch(() => "");
          throw new Error(errorText || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const updateAssistant = (
          updater: (msg: Message) => Message,
        ) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? updater(m) : m)),
          );
        };

        let firstTokenReceived = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            if (!block.startsWith("data:")) continue;
            const json = block.slice(5).trim();
            if (!json) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(json) as Record<string, unknown>;
            } catch {
              continue;
            }

            const type = event.type;
            if (type === "text") {
              if (!firstTokenReceived) {
                firstTokenReceived = true;
                setThinking(false);
              }
              const text = String(event.text ?? "");
              updateAssistant((m) => ({
                ...m,
                content: (m.content ?? "") + text,
              }));
            } else if (type === "embed") {
              const embedRaw = event.embed as
                | { kind: string; [k: string]: unknown }
                | undefined;
              if (embedRaw) {
                const embed = mapEmbed(embedRaw);
                if (embed) {
                  updateAssistant((m) => ({ ...m, embed }));
                }
              }
            } else if (type === "preview_open") {
              const quote = event.quote as PreviewQuotePayload | undefined;
              if (quote) {
                setCurrentQuote(previewToDraft(quote));
                setPreviewOpen(true);
              }
            } else if (type === "preview_close") {
              setPreviewOpen(false);
            } else if (type === "flash") {
              flash(String(event.content ?? ""));
            } else if (type === "done") {
              const newCid = event.conversationId;
              if (typeof newCid === "string") {
                conversationIdRef.current = newCid;
              }
            } else if (type === "error") {
              const msg = String(event.message ?? "Erreur");
              updateAssistant((m) => ({
                ...m,
                content: m.content
                  ? m.content
                  : `_${msg}_`,
              }));
            }
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connexion interrompue";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content || `_${message}_`,
                }
              : m,
          ),
        );
      } finally {
        setThinking(false);
        setSending(false);
      }
    },
    [buildHistoryForApi, flash],
  );

  const handleAction = useCallback(
    (action: AgentAction) => {
      if (sending && action.type !== "cancel_send") return;
      switch (action.type) {
        case "start_quote":
          void streamRequest("Je veux faire un devis.");
          return;
        case "start_new_client":
          void streamRequest("Je veux ajouter un client.");
          return;
        case "show_more_clients":
          setMessages((prev) => [
            ...prev,
            {
              id: newId("a"),
              role: "assistant",
              content: "Voilà tous tes clients :",
              embed: { type: "client_full_list" },
            },
          ]);
          return;
        case "create_new_client":
          setMessages((prev) => [
            ...prev,
            {
              id: newId("a"),
              role: "assistant",
              content: "Allez, on crée un nouveau client ensemble.",
              embed: { type: "new_client_form" },
            },
          ]);
          return;
        case "select_client":
          void streamRequest(
            `C'est pour ${action.client.name} (id: ${action.client.id}).`,
          );
          return;
        case "describe_chantier": {
          const desc =
            action.description === "__from_new_client__"
              ? "Salle de bain 6m², carrelage + peinture, lavabo et WC"
              : action.description;
          void streamRequest(desc);
          return;
        }
        case "send_quote_now":
          void streamRequest("Envoie le devis maintenant.");
          return;
        case "cancel_send":
          flash("OK, j'attends. Dis-moi quand tu veux l'envoyer.");
          return;
        case "quick_choice":
          void streamRequest(action.value);
          return;
        case "send_text":
          void streamRequest(action.text);
          return;
      }
    },
    [flash, sending, streamRequest],
  );

  const handleUserMessage = useCallback(
    (text: string) => {
      void streamRequest(text);
    },
    [streamRequest],
  );

  const handleLockedFieldClick = useCallback(
    (reason: string) => {
      flash(reason);
    },
    [flash],
  );

  const handleValidate = useCallback(() => {
    if (!currentQuote) return;
    void streamRequest("Valide le devis.");
  }, [currentQuote, streamRequest]);

  const handleDeleteLine = useCallback(
    (lineId: string) => {
      if (!currentQuote) return;
      setCurrentQuote({
        ...currentQuote,
        lines: currentQuote.lines.filter((l) => l.id !== lineId),
      });
      flash("Ligne supprimée");
    },
    [currentQuote, flash],
  );

  function resetConversation() {
    setMessages([WELCOME]);
    setCurrentQuote(null);
    setPreviewOpen(false);
    setThinking(false);
    setSending(false);
    conversationIdRef.current = null;
  }

  const showSplit = previewOpen && currentQuote !== null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEDFE]">
            <Pencil className="h-4 w-4 text-[#534AB7]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Le Rédacteur
            </p>
            <p className="flex items-center gap-1 text-[11px] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              En ligne
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetConversation}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <RotateCcw className="h-3 w-3" />
          Nouvelle conv
        </button>
      </header>

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden bg-[var(--surface)] transition-[grid-template-columns,grid-template-rows] duration-[400ms] ease-in-out",
          showSplit
            ? "grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[40%_60%] md:grid-rows-1"
            : "grid-cols-1 grid-rows-1",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col bg-white">
          <ChatMessages
            messages={messages}
            thinking={thinking}
            recentClients={recentClients}
            allClients={allClients}
            onAction={handleAction}
          />
          <ChatInput onSend={handleUserMessage} disabled={sending} />
        </div>

        {showSplit && currentQuote && (
          <div className="min-h-0 min-w-0 overflow-hidden border-t border-[var(--border)] md:border-l md:border-t-0">
            <QuotePreview
              quote={currentQuote}
              onUpdate={setCurrentQuote}
              onClose={() => setPreviewOpen(false)}
              onLockedFieldClick={handleLockedFieldClick}
              onValidate={handleValidate}
              onDeleteLine={handleDeleteLine}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function mapEmbed(
  raw: { kind: string; [k: string]: unknown },
): MessageEmbed | null {
  switch (raw.kind) {
    case "client_selector":
      return { type: "client_selector" };
    case "client_full_list":
      return { type: "client_full_list" };
    case "quick_choices": {
      const rawChoices = Array.isArray(raw.choices)
        ? (raw.choices as Array<{ label?: string; value?: string }>)
        : [];
      const choices = rawChoices
        .map((c) => ({
          label: String(c.label ?? ""),
          value: String(c.value ?? c.label ?? ""),
        }))
        .filter((c) => c.label.length > 0);
      if (choices.length < 2) return null;
      return {
        type: "quick_choices",
        question: typeof raw.question === "string" ? raw.question : undefined,
        choices,
      };
    }
    case "redirect": {
      return {
        type: "redirect",
        destination: String(raw.destination ?? ""),
        label: String(raw.label ?? "Y aller"),
        reason: String(raw.reason ?? ""),
        href: String(raw.href ?? "/dashboard"),
      };
    }
    default:
      return null;
  }
}
