"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { Send, Square } from "lucide-react";
import { VoiceButton } from "./VoiceButton";
import { toastError } from "@/lib/toast";

interface EmileInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onAbort?: () => void;
  placeholder?: string;
  /**
   * Called when a paste is detected as a STRUCTURED LIST (clean per-line list
   * or pasted Excel/TSV table) — see {@link looksStructuredList}. EmileChat
   * opens the BulkImportModal so the lines go through a structured editor +
   * direct DB write instead of being shoved through the LLM (which would burn
   * ~10k output tokens regurgitating them).
   *
   * Spoken-language pastes (rambling dictation, fillers, prices scattered mid
   * sentence) deliberately DON'T trigger this — they land in the textarea and
   * Émile interprets them conversationally. The only override is the absolute
   * {@link FORCE_BULK_LINES} safety valve, to avoid frying the LLM on a wall of
   * text.
   */
  onBulkPaste?: (rawText: string) => void;
}

// Hard cap shared with the server-side validation in /api/quotes/bulk-lines.
const HARD_CAP = 500;
// Au-delà de ce nombre de lignes brutes, on bascule en bulk QUOI QU'IL ARRIVE
// (même si ça ne ressemble pas à une liste) : un mur de texte ne doit jamais
// partir tel quel au LLM. En dessous, c'est la détection de structure qui décide.
const FORCE_BULK_LINES = 150;
// Minimum de lignes pour ne serait-ce qu'ENVISAGER le bulk. En dessous, Émile
// gère très bien en conversation, même une mini-liste.
const MIN_STRUCTURED_LINES = 6;

function nonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// Marqueurs de langage parlé / dictée — leur présence régulière signe un vocal
// désordonné qu'il ne faut PAS parser mécaniquement.
const FILLER_RE =
  /\b(euh+|heu+|alors|donc|voil[àa]|bah|ben|du coup|en fait|tu vois|enfin|hein|genre|ouais|bon ben)\b/i;

// Une ligne "structurée" : soit délimitée en colonnes (| tab ;), soit terminée
// par un prix (nombre éventuellement suivi de € / EUR / HT) précédé d'un libellé.
function hasColumnDelimiter(line: string): boolean {
  return /[|\t;]/.test(line);
}
function endsWithPrice(line: string): boolean {
  const m = /([\d][\d .,]*)\s*(?:€|eur|ht)?\s*$/i.exec(line.trim());
  if (!m || !/\d/.test(m[1])) return false;
  // Il faut un libellé non-vide AVANT le prix (sinon c'est juste un nombre seul).
  return line.trim().slice(0, m.index).trim().length > 0;
}
function wordCount(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}

/**
 * Détecte si un collage est une LISTE STRUCTURÉE (liste propre / tableau Excel)
 * plutôt que du langage parlé. Conservateur : en cas de doute, on renvoie false
 * pour laisser Émile interpréter en conversation.
 */
function looksStructuredList(lines: string[]): boolean {
  const n = lines.length;
  if (n < MIN_STRUCTURED_LINES) return false;

  const delimited = lines.filter(hasColumnDelimiter).length;
  const priced = lines.filter(endsWithPrice).length;
  const longLines = lines.filter((l) => wordCount(l) > 12).length;
  const fillerLines = lines.filter((l) => FILLER_RE.test(l)).length;

  const delimRatio = delimited / n;
  const priceRatio = priced / n;
  const longRatio = longLines / n;
  const fillerRatio = fillerLines / n;

  // Tableau collé (Excel/TSV/CSV) : motif de colonnes très régulier → on fait
  // confiance même si certaines cellules sont longues.
  if (delimRatio >= 0.6) return true;

  // Liste "libellé … prix" : la majorité des lignes finissent par un prix, les
  // lignes sont courtes, et les marqueurs de langage parlé sont quasi absents.
  return priceRatio >= 0.6 && longRatio <= 0.2 && fillerRatio <= 0.1;
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

  // Auto-resize the textarea up to ~10 lines, then let it scroll. We can't
  // do this purely in CSS because `height: auto` on a textarea is fixed at
  // its rows attribute; we measure scrollHeight after every value change.
  // The CSS class still pins min/max so a wipe back to "" snaps to the
  // single-row default and a 50-line paste stops growing at the cap.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Reset to "auto" first so scrollHeight reflects the CONTENT height
    // (not the previous explicit height which would lock us in only-grow).
    el.style.height = "auto";
    const max = 240; // ~10 lines at our line-height; matches CSS max-h-60.
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
  }, [value]);

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
    const lines = nonEmptyLines(pasted);
    const lineCount = lines.length;
    if (lineCount > HARD_CAP) {
      e.preventDefault();
      toastError(
        `Limite ${HARD_CAP} lignes par devis dépassée (${lineCount} détectées). Sépare en 2 devis ou retire des lignes.`,
      );
      return;
    }
    // Bulk si : mur de texte (sécurité absolue) OU collage manifestement
    // structuré. Sinon (vocal bavard, langage parlé), on laisse le paste
    // atterrir dans le textarea et Émile l'interprète en conversation.
    if (lineCount >= FORCE_BULK_LINES || looksStructuredList(lines)) {
      // preventDefault so the paste doesn't land in the textarea — the
      // BulkImportModal becomes the structured editor for it instead.
      e.preventDefault();
      onBulkPaste(pasted);
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-[var(--border)] bg-white px-3 py-3">
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
          // text-base = 16px on mobile keeps iOS Safari from auto-zooming on
          // focus (the trigger is any input/textarea < 16px). We bump back
          // down to 13px at sm: so desktop keeps its compact density.
          // touch-action: manipulation removes the 300ms tap delay and the
          // double-tap-to-zoom gesture on the textarea itself.
          // max-h-60 = 240px ≈ 10 lines; matches the JS cap in the
          // auto-resize effect above.
          className="max-h-60 min-h-[36px] flex-1 resize-none overflow-y-auto rounded-xl border border-[var(--border)] bg-gray-50 px-3.5 py-2 text-base outline-none transition-all touch-manipulation placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60 sm:text-[13px]"
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
