"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { EmileMessage } from "@/hooks/useEmile";

interface QuickRepliesProps {
  message: EmileMessage | undefined;
  onSelect: (text: string) => void;
  /** Pendant qu'Émile traite : grise les boutons + bloque toute sélection. */
  disabled?: boolean;
}

// Multi-line + case-insensitive: the model occasionally puts the marker on its
// own line and casing has drifted across prompt iterations.
const QUICK_REPLIES_REGEX = /\[QUICK_REPLIES:\s*([\s\S]+?)\]/i;
const PROFILE_BUTTON_REGEX = /\[PROFILE_BUTTON:\s*"?([^\]"]+)"?\s*\]/i;
const CLIENT_PICKER_REGEX = /\[CLIENT_PICKER\]/i;
const OPEN_QUOTE_LINE_MODAL_REGEX = /\[OPEN_QUOTE_LINE_MODAL\]/i;
// Two accepted shapes: bare `[OPEN_PROFILE_MODAL]` (the modal will read missing
// fields via the API) or `[OPEN_PROFILE_MODAL: "first_name","siret",...]` so
// the model can echo the exact `missing_required` list it just got back from
// checkProfileCompleteness. The list form skips an extra round-trip.
const OPEN_PROFILE_MODAL_REGEX = /\[OPEN_PROFILE_MODAL(?::\s*([\s\S]+?))?\]/i;
// Legacy marker (auto-open) — kept stripped so any stale BDD message stays clean.
const OPEN_CLIENT_MODAL_REGEX = /\[OPEN_CLIENT_MODAL\]/i;
// Edit-existing-client marker. Format:
//   [OPEN_CLIENT_EDIT_MODAL: "<client_id>", "<missing_field_1>", "<missing_field_2>"]
// First arg = the client_id returned by sendQuote's client_incomplete branch,
// remaining args = the snake_case missing field codes (address, postal_code,
// city, name). The frontend fetches the client by id, opens NewClientModal
// in EDIT mode pre-filled, and highlights the listed missing fields.
const OPEN_CLIENT_EDIT_MODAL_REGEX =
  /\[OPEN_CLIENT_EDIT_MODAL(?::\s*([\s\S]+?))?\]/i;

export function parseQuickReplies(text: string): {
  cleaned: string;
  replies: string[];
} {
  let cleaned = text;
  const match = cleaned.match(QUICK_REPLIES_REGEX);
  const replies = match
    ? match[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, "").trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];
  cleaned = cleaned.replace(QUICK_REPLIES_REGEX, "").trim();
  cleaned = cleaned.replace(PROFILE_BUTTON_REGEX, "").trim();
  cleaned = cleaned.replace(CLIENT_PICKER_REGEX, "").trim();
  cleaned = cleaned.replace(OPEN_CLIENT_MODAL_REGEX, "").trim();
  cleaned = cleaned.replace(OPEN_QUOTE_LINE_MODAL_REGEX, "").trim();
  cleaned = cleaned.replace(OPEN_PROFILE_MODAL_REGEX, "").trim();
  cleaned = cleaned.replace(OPEN_CLIENT_EDIT_MODAL_REGEX, "").trim();
  return { cleaned, replies };
}

export function parseOpenClientEditModal(
  text: string,
): { found: boolean; clientId: string | null; missing: string[] } {
  const m = text.match(OPEN_CLIENT_EDIT_MODAL_REGEX);
  if (!m) return { found: false, clientId: null, missing: [] };
  if (!m[1]) return { found: true, clientId: null, missing: [] };
  const parts = m[1]
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { found: true, clientId: null, missing: [] };
  }
  const [first, ...rest] = parts;
  // The model occasionally drops the "client_id=" prefix; tolerate both.
  const clientId = first.replace(/^client_id\s*=\s*/i, "");
  // Same for the missing fields (some completions wrap them in `missing="..."`).
  const missing = rest.map((p) => p.replace(/^missing\s*=\s*/i, ""));
  return { found: true, clientId: clientId || null, missing };
}

export function parseOpenProfileModal(
  text: string,
): { found: boolean; missing: string[] } {
  const m = text.match(OPEN_PROFILE_MODAL_REGEX);
  if (!m) return { found: false, missing: [] };
  if (!m[1]) return { found: true, missing: [] };
  const fields = m[1]
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
  return { found: true, missing: fields };
}

export function hasOpenProfileModal(text: string): boolean {
  return OPEN_PROFILE_MODAL_REGEX.test(text);
}

export function parseProfileButton(text: string): string | null {
  const match = text.match(PROFILE_BUTTON_REGEX);
  if (!match) return null;
  const label = match[1].trim();
  return label.length > 0 ? label : "Compléter mon profil";
}

export function hasClientPicker(text: string): boolean {
  return CLIENT_PICKER_REGEX.test(text);
}

export function hasOpenQuoteLineModal(text: string): boolean {
  return OPEN_QUOTE_LINE_MODAL_REGEX.test(text);
}

function getMessageText(message: EmileMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p) => (p as { type?: string }).type === "text")
    .map((p) => (p as { text?: string }).text ?? "")
    .join("\n");
}

export function QuickReplies({
  message,
  onSelect,
  disabled = false,
}: QuickRepliesProps) {
  const [hiddenForId, setHiddenForId] = useState<string | null>(null);
  const [pressedReply, setPressedReply] = useState<string | null>(null);
  // Free-text "Autre…" escape hatch — always available on top of the model's
  // options so the artisan can type their own value on ANY closed question.
  const [otherMode, setOtherMode] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  const messageId = message?.id;
  useEffect(() => {
    if (messageId && hiddenForId && hiddenForId !== messageId) {
      setHiddenForId(null);
      setPressedReply(null);
    }
  }, [messageId, hiddenForId]);

  // Reset the "Autre…" input when the active message changes. Done during
  // render (React's documented "adjust state on prop change" pattern) rather
  // than in an effect — no extra commit, no flash.
  const prevMessageIdRef = useRef(messageId);
  if (prevMessageIdRef.current !== messageId) {
    prevMessageIdRef.current = messageId;
    if (otherMode) setOtherMode(false);
    if (otherValue) setOtherValue("");
  }

  if (!message || message.role !== "assistant") return null;
  if (hiddenForId === message.id) return null;

  const text = getMessageText(message);
  const { replies } = parseQuickReplies(text);
  if (replies.length === 0) return null;

  function send(value: string) {
    const v = value.trim();
    if (!message || !v || disabled) return;
    // Press animation: hold the row in a faded/pressed state for ~180ms before
    // calling onSelect — gives an iOS-style "tap" feel before the user bubble
    // mounts and replaces this row.
    setPressedReply(value);
    setHiddenForId(message.id);
    window.setTimeout(() => {
      onSelect(v);
    }, 180);
  }

  // The front always offers a free-text option, so the model never needs to
  // emit its own "Autre" (the system prompt tells it not to). Dedupe in case an
  // older message still carries one.
  const hasOwnOther = replies.some((r) => /^autre/i.test(r.trim()));
  const fading = pressedReply !== null;

  if (otherMode) {
    return (
      <div className="flex flex-shrink-0 items-center gap-2 border-t border-[var(--border)] bg-white px-4 py-3">
        <input
          type="text"
          autoFocus
          value={otherValue}
          onChange={(e) => setOtherValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send(otherValue);
            }
            if (e.key === "Escape") setOtherMode(false);
          }}
          placeholder="Ta réponse…"
          className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-white px-3.5 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={() => send(otherValue)}
          disabled={!otherValue.trim()}
          className="shrink-0 rounded-full bg-[var(--primary)] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Envoyer
        </button>
        <button
          type="button"
          onClick={() => setOtherMode(false)}
          className="shrink-0 rounded-full px-2 py-1.5 text-[13px] text-[var(--text-secondary)] hover:underline"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Mobile = stack vertical (one tap target per line, easier on thumbs);
        // ≥sm = horizontal wrap so multi-option rows breathe on desktop.
        "flex flex-shrink-0 flex-col gap-2 border-t border-[var(--border)] bg-white px-4 py-3 transition-opacity duration-200 sm:flex-row sm:flex-wrap",
        fading ? "opacity-0" : "opacity-100",
        // Pendant le traitement : grisé + non-cliquable (anti actions concurrentes).
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {replies.map((reply, i) => {
        const isPressed = pressedReply === reply;
        return (
          <button
            key={`${reply}-${i}`}
            type="button"
            onClick={() => send(reply)}
            disabled={fading || disabled}
            className={cn(
              "w-full rounded-full border border-[var(--border)] bg-[var(--primary-bg)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--primary)] shadow-sm transition-all duration-150 sm:w-auto",
              "hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white hover:shadow-md",
              "active:scale-95",
              isPressed && "scale-95 bg-[var(--primary)] text-white",
            )}
          >
            {reply}
          </button>
        );
      })}
      {!hasOwnOther && (
        <button
          type="button"
          onClick={() => setOtherMode(true)}
          disabled={fading || disabled}
          className={cn(
            "w-full rounded-full border border-dashed border-[var(--border)] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-all duration-150 sm:w-auto",
            "hover:border-[var(--primary)] hover:text-[var(--primary)]",
            "active:scale-95",
          )}
        >
          Autre…
        </button>
      )}
    </div>
  );
}
