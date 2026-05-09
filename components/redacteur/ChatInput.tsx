"use client";

import { useRef, useState } from "react";
import { Mic, Send } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="border-t border-[var(--border)] bg-white px-3 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        <button
          type="button"
          aria-label="Dictée vocale (à venir)"
          title="Dictée vocale (à venir)"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[#EEEDFE] hover:text-[#534AB7]"
        >
          <Mic className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={disabled ? "Le Rédacteur réfléchit…" : "Écris ton message…"}
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
