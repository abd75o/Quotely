"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { EmileMessage } from "@/hooks/useEmile";

interface QuickRepliesProps {
  message: EmileMessage | undefined;
  onSelect: (text: string) => void;
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
  if (process.env.NODE_ENV !== "production" && text.includes("QUICK_REPLIES")) {
    // eslint-disable-next-line no-console
    console.debug("[QR Parser]", { found: !!match, options: replies });
  }
  cleaned = cleaned.replace(QUICK_REPLIES_REGEX, "").trim();
  cleaned = cleaned.replace(PROFILE_BUTTON_REGEX, "").trim();
  cleaned = cleaned.replace(CLIENT_PICKER_REGEX, "").trim();
  cleaned = cleaned.replace(OPEN_CLIENT_MODAL_REGEX, "").trim();
  cleaned = cleaned.replace(OPEN_QUOTE_LINE_MODAL_REGEX, "").trim();
  cleaned = cleaned.replace(OPEN_PROFILE_MODAL_REGEX, "").trim();
  return { cleaned, replies };
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

export function QuickReplies({ message, onSelect }: QuickRepliesProps) {
  const [hiddenForId, setHiddenForId] = useState<string | null>(null);
  const [pressedReply, setPressedReply] = useState<string | null>(null);

  const messageId = message?.id;
  useEffect(() => {
    if (messageId && hiddenForId && hiddenForId !== messageId) {
      setHiddenForId(null);
      setPressedReply(null);
    }
  }, [messageId, hiddenForId]);

  if (!message || message.role !== "assistant") return null;
  if (hiddenForId === message.id) return null;

  const text = getMessageText(message);
  const { replies } = parseQuickReplies(text);
  if (replies.length === 0) return null;

  function handleClick(reply: string) {
    if (!message) return;
    // Press animation: hold the row in a faded/pressed state for ~180ms before
    // calling onSelect — gives an iOS-style "tap" feel before the user bubble
    // mounts and replaces this row.
    setPressedReply(reply);
    setHiddenForId(message.id);
    window.setTimeout(() => {
      onSelect(reply);
    }, 180);
  }

  const fading = pressedReply !== null;

  return (
    <div
      className={cn(
        // Mobile = stack vertical (one tap target per line, easier on thumbs);
        // ≥sm = horizontal wrap so multi-option rows breathe on desktop.
        "flex flex-col gap-2 border-t border-[var(--border)] bg-white px-4 py-3 transition-opacity duration-200 sm:flex-row sm:flex-wrap",
        fading ? "opacity-0" : "opacity-100",
      )}
    >
      {replies.map((reply, i) => {
        const isPressed = pressedReply === reply;
        return (
          <button
            key={`${reply}-${i}`}
            type="button"
            onClick={() => handleClick(reply)}
            disabled={fading}
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
    </div>
  );
}
