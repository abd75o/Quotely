"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { VoiceButton } from "./VoiceButton";

interface EmileInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onAbort?: () => void;
  placeholder?: string;
}

export function EmileInput({
  onSend,
  isLoading,
  onAbort,
  placeholder,
}: EmileInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(value);
    }
  }

  return (
    <div className="border-t border-[var(--border)] bg-white px-3 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex items-end gap-2"
      >
        {/* V2 (sept 2026) - Activer la dictée vocale en passant disabled={false} */}
        <VoiceButton onTranscription={(text) => submit(text)} disabled />
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ??
            (isLoading ? "Émile réfléchit…" : "Décris ton chantier à Émile…")
          }
          disabled={isLoading}
          className="max-h-32 min-h-[36px] flex-1 resize-none rounded-xl border border-[var(--border)] bg-gray-50 px-3.5 py-2 text-[13px] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
        />
        {isLoading && onAbort ? (
          <button
            type="button"
            onClick={onAbort}
            aria-label="Stopper Émile"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--text-secondary)] transition-colors hover:border-red-300 hover:text-red-600"
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            aria-label="Envoyer"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
