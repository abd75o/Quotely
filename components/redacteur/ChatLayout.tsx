"use client";

import { useCallback, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { QuotePreview } from "./QuotePreview";
import type {
  AgentAction,
  Message,
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

const SUGGESTED_DESCRIPTION =
  '"Salle de bain 6m², carrelage + peinture, lavabo et WC"';

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

const MOCK_LINES: QuoteLine[] = [
  { id: "l1", label: "Dépose ancien lavabo + WC", price: 120 },
  { id: "l2", label: "Pose lavabo neuf (fourni)", price: 280 },
  { id: "l3", label: "Pose WC neuf (fourni)", price: 220 },
  { id: "l4", label: "Carrelage sol 6m² (pose + colle)", price: 540 },
  { id: "l5", label: "Peinture murs (2 couches)", price: 420 },
];

function formatToday(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function generateNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Date.now()).slice(-4);
  return `QTL-${year}-${seq}`;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function ChatLayout({
  initialMessages,
  recentClients,
  allClients,
}: ChatLayoutProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0 ? initialMessages : [WELCOME],
  );
  const [thinking, setThinking] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<QuoteDraft | null>(null);
  const [pendingClient, setPendingClient] = useState<RedacteurClient | null>(
    null,
  );

  const append = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const flash = useCallback(
    (content: string) => {
      append({ id: newId("flash"), role: "system_flash", content });
    },
    [append],
  );

  const buildMockQuote = useCallback((client: RedacteurClient): QuoteDraft => {
    return {
      number: generateNumber(),
      client,
      date: formatToday(),
      validity: 30,
      tva: 10,
      lines: MOCK_LINES.map((l) => ({ ...l })),
      status: "draft",
    };
  }, []);

  const handleAction = useCallback(
    (action: AgentAction) => {
      switch (action.type) {
        case "start_quote": {
          append({ id: newId("user"), role: "user", content: "Faire un devis" });
          append({
            id: newId("a"),
            role: "assistant",
            content: "OK, pour quel client ?",
            embed: { type: "client_selector" },
          });
          return;
        }

        case "start_new_client": {
          append({
            id: newId("user"),
            role: "user",
            content: "Ajouter un client",
          });
          append({
            id: newId("a"),
            role: "assistant",
            content: "Allez, on va l'ajouter ensemble.",
            embed: { type: "new_client_form" },
          });
          return;
        }

        case "show_more_clients": {
          append({
            id: newId("a"),
            role: "assistant",
            content: "Voilà tous tes clients :",
            embed: { type: "client_full_list" },
          });
          return;
        }

        case "create_new_client": {
          append({
            id: newId("a"),
            role: "assistant",
            content: "Ok, on crée un nouveau client.",
            embed: { type: "new_client_form" },
          });
          return;
        }

        case "select_client": {
          setPendingClient(action.client);
          append({
            id: newId("user"),
            role: "user",
            content: action.client.name,
          });
          append({
            id: newId("a"),
            role: "assistant",
            content: "Décris-moi le chantier, je m'occupe du reste.",
            embed: {
              type: "choice_buttons",
              choices: [
                {
                  label: SUGGESTED_DESCRIPTION,
                  action: "describe_chantier",
                  payload: SUGGESTED_DESCRIPTION,
                },
              ],
            },
          });
          return;
        }

        case "describe_chantier": {
          const description =
            action.description === "__from_new_client__"
              ? SUGGESTED_DESCRIPTION
              : action.description;
          if (!pendingClient) return;
          append({ id: newId("user"), role: "user", content: description });
          setThinking(true);
          window.setTimeout(() => {
            const quote = buildMockQuote(pendingClient);
            setCurrentQuote(quote);
            setPreviewOpen(true);
            setThinking(false);
            append({
              id: newId("a"),
              role: "assistant",
              content: "Voilà. Point vert = éditable, cadenas = demande-moi.",
            });
          }, 1500);
          return;
        }

        case "send_quote_now": {
          if (!currentQuote) return;
          const email =
            currentQuote.client.email ?? "l'adresse renseignée plus tard";
          append({
            id: newId("user"),
            role: "user",
            content: "Envoyer maintenant",
          });
          setCurrentQuote({ ...currentQuote, status: "sent" });
          append({
            id: newId("a"),
            role: "assistant",
            content: `Devis envoyé à ${email}. La Sentinelle te préviendra si pas de signature dans 7 jours.`,
          });
          return;
        }

        case "cancel_send": {
          append({ id: newId("user"), role: "user", content: "Annuler" });
          append({
            id: newId("a"),
            role: "assistant",
            content: "OK, j'attends. Dis-moi quand tu veux l'envoyer.",
          });
          return;
        }
      }
    },
    [append, buildMockQuote, currentQuote, pendingClient],
  );

  const handleUserMessage = useCallback(
    (text: string) => {
      append({ id: newId("user"), role: "user", content: text });
      append({
        id: newId("a"),
        role: "assistant",
        content:
          "(L'IA arrive au prochain sprint — pour l'instant utilise les boutons.)",
      });
    },
    [append],
  );

  const handleLockedFieldClick = useCallback(
    (reason: string) => {
      flash(reason);
    },
    [flash],
  );

  const handleValidate = useCallback(() => {
    if (!currentQuote) return;
    const email = currentQuote.client.email ?? "l'adresse renseignée plus tard";
    setCurrentQuote({ ...currentQuote, status: "validated" });
    append({
      id: newId("a"),
      role: "assistant",
      content: `Parfait. Je t'envoie le lien de signature à ${email}.`,
      embed: { type: "send_actions", email },
    });
  }, [append, currentQuote]);

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
    setPendingClient(null);
    setThinking(false);
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
          <ChatInput onSend={handleUserMessage} disabled={thinking} />
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
