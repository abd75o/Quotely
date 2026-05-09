"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { VoiceButton, type VoiceMode } from "./VoiceButton";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const TOOLTIP_STORAGE_KEY = "redacteur-voice-tooltip-seen";

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showVoiceTip, setShowVoiceTip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem(TOOLTIP_STORAGE_KEY)) {
        setShowVoiceTip(true);
      }
    } catch { /* ignore (localStorage may be blocked) */ }
  }, []);

  function dismissTip() {
    try {
      window.localStorage.setItem(TOOLTIP_STORAGE_KEY, "1");
    } catch { /* ignore */ }
    setShowVoiceTip(false);
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  function handleTranscription(text: string, mode: VoiceMode) {
    if (mode === "long") {
      submit(text);
      return;
    }
    setValue((prev) => (prev ? `${prev} ${text}` : text));
    inputRef.current?.focus();
  }

  return (
    <div className="relative border-t border-[var(--border)] bg-white px-3 py-3">
      {showVoiceTip && (
        <div className="absolute bottom-full left-3 z-30 mb-2 w-72 rounded-xl bg-gray-900 p-3 text-white shadow-2xl ring-1 ring-black/10">
          <button
            type="button"
            onClick={dismissTip}
            aria-label="Fermer"
            className="absolute right-1.5 top-1.5 rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="pr-4 text-[12px] leading-relaxed">
            <span aria-hidden="true">💡 </span>
            <strong>Tap</strong> = dicter (transcription éditable)
            <br />
            <strong>Maintien</strong> = vocal direct (envoi rapide)
          </p>
          <button
            type="button"
            onClick={dismissTip}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-white px-3 py-1 text-[11px] font-semibold text-gray-900 transition-colors hover:bg-gray-100"
          >
            Compris
          </button>
          <span className="absolute -bottom-1 left-6 h-2 w-2 rotate-45 bg-gray-900" />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex items-end gap-2"
      >
        <VoiceButton
          onTranscription={handleTranscription}
          disabled={disabled}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            disabled ? "Le Rédacteur réfléchit…" : "Écris ton message…"
          }
          disabled={disabled}
          className="h-9 flex-1 rounded-xl border border-[var(--border)] bg-gray-50 px-3.5 text-[13px] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          aria-label="Envoyer"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#534AB7] text-white transition-colors hover:bg-[#3C3489] disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
