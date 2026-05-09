"use client";

import { useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { ClientSelector } from "./ClientSelector";
import { ClientFullList } from "./ClientFullList";
import { NewClientForm } from "./NewClientForm";
import type {
  AgentAction,
  ChoiceButton,
  Message,
  RedacteurClient,
} from "./types";

interface ChatMessagesProps {
  messages: Message[];
  thinking: boolean;
  recentClients: RedacteurClient[];
  allClients: RedacteurClient[];
  onAction: (action: AgentAction) => void;
}

export function ChatMessages({
  messages,
  thinking,
  recentClients,
  allClients,
  onAction,
}: ChatMessagesProps) {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <MessageRow
          key={msg.id}
          message={msg}
          recentClients={recentClients}
          allClients={allClients}
          onAction={onAction}
        />
      ))}
      {thinking && (
        <div className="flex items-end gap-2">
          <Avatar />
          <div className="rounded-[var(--border-radius-md,0.5rem)] border border-[var(--border)] bg-white px-3 py-2 text-[13px] text-[var(--text-muted)]">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:-200ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:-100ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]" />
            </span>
          </div>
        </div>
      )}
      <div ref={scrollEndRef} />
    </div>
  );
}

function MessageRow({
  message,
  recentClients,
  allClients,
  onAction,
}: {
  message: Message;
  recentClients: RedacteurClient[];
  allClients: RedacteurClient[];
  onAction: (action: AgentAction) => void;
}) {
  if (message.role === "system_flash") {
    return (
      <div className="px-2 py-1 text-center">
        <span className="text-[11px] italic text-[var(--text-muted)]">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[var(--border-radius-md,0.5rem)] bg-[#EEEDFE] px-3 py-2 text-[13px] text-[#3C3489]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <Avatar />
      <div className="max-w-[85%] space-y-2">
        {message.content && (
          <div className="rounded-[var(--border-radius-md,0.5rem)] border border-[var(--border)] bg-white px-3 py-2 text-[13px] text-[var(--text-primary)]">
            {message.content}
          </div>
        )}
        {message.embed && (
          <Embed
            embed={message.embed}
            recentClients={recentClients}
            allClients={allClients}
            onAction={onAction}
          />
        )}
      </div>
    </div>
  );
}

function Embed({
  embed,
  recentClients,
  allClients,
  onAction,
}: {
  embed: NonNullable<Message["embed"]>;
  recentClients: RedacteurClient[];
  allClients: RedacteurClient[];
  onAction: (action: AgentAction) => void;
}) {
  switch (embed.type) {
    case "choice_buttons":
      return <ChoiceButtonsEmbed choices={embed.choices} onAction={onAction} />;
    case "client_selector":
      return (
        <ClientSelector
          clients={recentClients}
          onSelect={(client) => onAction({ type: "select_client", client })}
          onShowMore={() => onAction({ type: "show_more_clients" })}
          onNew={() => onAction({ type: "create_new_client" })}
        />
      );
    case "client_full_list":
      return (
        <ClientFullList
          clients={allClients}
          onSelect={(client) => onAction({ type: "select_client", client })}
        />
      );
    case "new_client_form":
      return (
        <NewClientForm
          onComplete={(newClient, makeQuoteNow) => {
            onAction({ type: "select_client", client: newClient });
            if (makeQuoteNow) {
              onAction({
                type: "describe_chantier",
                description: "__from_new_client__",
              });
            }
          }}
        />
      );
    case "send_actions":
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAction({ type: "send_quote_now" })}
            className="rounded-lg bg-[#534AB7] px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#3C3489]"
          >
            Envoyer maintenant
          </button>
          <button
            type="button"
            onClick={() => onAction({ type: "cancel_send" })}
            className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Annuler
          </button>
        </div>
      );
  }
}

function ChoiceButtonsEmbed({
  choices,
  onAction,
}: {
  choices: ChoiceButton[];
  onAction: (action: AgentAction) => void;
}) {
  const limited = choices.slice(0, 4);
  return (
    <div className="flex flex-wrap gap-2">
      {limited.map((choice) => (
        <button
          key={choice.label}
          type="button"
          onClick={() => {
            switch (choice.action) {
              case "start_quote":
                onAction({ type: "start_quote" });
                return;
              case "start_new_client":
                onAction({ type: "start_new_client" });
                return;
              case "describe_chantier":
                onAction({
                  type: "describe_chantier",
                  description: String(choice.payload ?? choice.label),
                });
                return;
            }
          }}
          className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[#534AB7] hover:bg-[#EEEDFE] hover:text-[#3C3489]"
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EEEDFE]">
      <Pencil className="h-3.5 w-3.5 text-[#534AB7]" />
    </div>
  );
}
