"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Mic, MicOff, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: { [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}
declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Quels devis sont en attente de signature ?",
  "Quel est mon taux de signature ce mois ?",
  "Comment relancer un client efficacement ?",
  "Montre-moi mes statistiques",
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Salut ! Je suis ton assistant Quovi. Pose-moi une question sur tes devis, tes clients ou tes statistiques — je suis là pour te faire gagner du temps.",
};

export function AssistantPanel() {
  const [metier, setMetier] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase
        .from("profiles")
        .select("metier")
        .single()
        .then(({ data }) => {
          setMetier(data?.metier ?? undefined);
        });
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      setLoading(true);

      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            metier: metier ?? "artisan",
          }),
        });

        if (!response.ok) throw new Error("Request failed");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No reader");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const { text: delta } = JSON.parse(data);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + delta }
                    : m,
                ),
              );
            } catch {
              // skip malformed chunk
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Désolé, une erreur est survenue. Réessaie dans quelques instants.",
                }
              : m,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, metier],
  );

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setInput(transcript);
        sendMessage(transcript);
      }
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  const hasSpeech =
    typeof window !== "undefined" &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[#E6F1FB] px-5 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white">
          <Bot className="h-5 w-5 text-[#185FA5]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            L&apos;Assistant
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Disponible 24/7 — pose-lui n&apos;importe quelle question.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          En ligne
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]",
                msg.role === "user"
                  ? "rounded-br-sm bg-[var(--primary)] text-white"
                  : "rounded-bl-sm bg-gray-100 text-[var(--text-primary)]",
              )}
            >
              {msg.content || (
                <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Réflexion…
                </span>
              )}
            </div>
          </div>
        ))}

        {messages.length === 1 && (
          <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="cursor-pointer rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-bg)] hover:text-[var(--primary)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[var(--border)] bg-white px-3 py-3 sm:px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          {hasSpeech && (
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                "flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors",
                listening
                  ? "animate-pulse bg-red-50 text-red-500"
                  : "text-[var(--text-muted)] hover:bg-[var(--primary-bg)] hover:text-[var(--primary)]",
              )}
              aria-label={listening ? "Arrêter la dictée" : "Dicter un message"}
            >
              {listening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose ta question…"
            disabled={loading}
            className="h-10 flex-1 rounded-xl border border-[var(--border)] bg-gray-50 px-4 text-sm outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[var(--primary)] text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-40"
            aria-label="Envoyer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
