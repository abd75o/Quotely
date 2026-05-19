"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { VoiceButton } from "./VoiceButton";
import { toastError } from "@/lib/toast";

interface EmileInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onAbort?: () => void;
  placeholder?: string;
  /**
   * Called when the user pastes content with more than {@link BULK_THRESHOLD}
   * non-empty lines. EmileChat opens the BulkImportModal so the lines go
   * through a structured editor + direct DB write instead of being shoved
   * through the LLM (which would burn ~10k output tokens regurgitating them).
   */
  onBulkPaste?: (rawText: string) => void;
}

// Heuristic threshold: 25 lines = roughly "more than a typical chat message
// could justify going through the LLM". Stays in sync with the system prompt
// notice about long pastes.
const BULK_THRESHOLD = 25;
// Hard cap shared with the server-side validation in /api/quotes/bulk-lines.
const HARD_CAP = 500;

function countNonEmptyLines(text: string): number {
  let n = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length > 0) n += 1;
  }
  return n;
}

export function EmileInput({
  onSend,
  isLoading,
  onAbort,
  placeholder,
  onBulkPaste,
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

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    if (!onBulkPaste) return;
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    const lineCount = countNonEmptyLines(pasted);
    if (lineCount > HARD_CAP) {
      e.preventDefault();
      toastError(
        `Limite ${HARD_CAP} lignes par devis dépassée (${lineCount} détectées). Sépare en 2 devis ou retire des lignes.`,
      );
      return;
    }
    if (lineCount > BULK_THRESHOLD) {
      // preventDefault so the huge paste doesn't land in the textarea — the
      // BulkImportModal becomes the structured editor for it instead.
      e.preventDefault();
      onBulkPaste(pasted);
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
          onPaste={handlePaste}
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
