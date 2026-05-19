"use client";

import { memo } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseQuickReplies,
  parseProfileButton,
  hasClientPicker,
} from "./QuickReplies";
import { ProfileButton } from "./ProfileButton";
import { ClientPicker } from "./ClientPicker";
import type { EmileMessage as EmileMessageType } from "@/hooks/useEmile";

interface EmileMessageProps {
  message: EmileMessageType;
  onPickExistingClient?: () => void;
  onPickNewClient?: () => void;
  /**
   * `true` if a follow-up user message already exists after this bubble — the
   * picker buttons are then hidden so a stale bubble can't reopen the flow.
   */
  pickerDisabled?: boolean;
}

function getText(message: EmileMessageType): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p) => (p as { type?: string }).type === "text")
    .map((p) => (p as { text?: string }).text ?? "")
    .join("\n");
}

function hasToolCall(message: EmileMessageType): boolean {
  if (!Array.isArray(message.parts)) return false;
  return message.parts.some((p) => {
    const type = (p as { type?: string }).type ?? "";
    return type.startsWith("tool-") && type !== "tool-result";
  });
}

function renderInline(text: string): React.ReactNode[] {
  // light markdown: **bold**, `code`
  const out: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      out.push(<strong key={`b-${i++}`}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      out.push(
        <code
          key={`c-${i++}`}
          className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-[12px]"
        >
          {m[3]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderMessageBody(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      return (
        <div key={idx} className="flex gap-2">
          <span aria-hidden className="select-none text-[var(--text-muted)]">
            •
          </span>
          <span>{renderInline(bullet[1])}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={idx} className="h-2" />;
    return <div key={idx}>{renderInline(line)}</div>;
  });
}

function EmileMessageInner({
  message,
  onPickExistingClient,
  onPickNewClient,
  pickerDisabled,
}: EmileMessageProps) {
  const text = getText(message);
  const { cleaned, replies } = parseQuickReplies(text);
  const profileLabel = parseProfileButton(text);
  const showClientPicker =
    message.role === "assistant" &&
    hasClientPicker(text) &&
    !!onPickExistingClient &&
    !!onPickNewClient;
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // Internal protocol messages (modal completions, picker cancels, etc.) are
  // sent through sendMessage() so the model receives them, but they must not
  // surface in the UI as if the artisan typed them. We detect the [SYSTEM]
  // sentinel on user messages and render them as the same discreet centered
  // pill we use for true system-role messages (bug C6).
  const isInternalSystem = isUser && /^\[SYSTEM\]/i.test(cleaned);

  if (isSystem || isInternalSystem) {
    const pillText = isInternalSystem
      ? cleaned.replace(/^\[SYSTEM\]\s*—?\s*/i, "").trim()
      : cleaned;
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
          {pillText || "…"}
        </span>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="emile-bubble-enter-user max-w-[80%] rounded-2xl rounded-br-md bg-[var(--primary)] px-3.5 py-2 text-[13px] text-white shadow-sm whitespace-pre-wrap">
          {cleaned || <span className="opacity-60">…</span>}
        </div>
      </div>
    );
  }

  // Assistant: a "thinking" bubble appears while tool-calls are running but no text yet.
  // The dedicated typing indicator at the bottom of the chat handles the general loading case,
  // so we only show an inline thinking dot trio when this message itself has tool activity but no content.
  const isThinking = !cleaned && hasToolCall(message);
  // Fallback when the model returns ONLY a [QUICK_REPLIES: …] marker or nothing
  // at all — without this, the bubble renders as a blank pill.
  const bodyText =
    cleaned || (replies.length > 0 ? "Choisis :" : isThinking ? "" : "…");

  return (
    <div className="emile-bubble-enter-assistant flex items-end gap-2">
      <Avatar />
      <div
        className={cn(
          "flex max-w-[80%] flex-col rounded-2xl rounded-bl-md border border-[var(--border)] bg-white px-3.5 py-2 text-[13px] text-[var(--text-primary)] shadow-sm",
        )}
      >
        {isThinking ? (
          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
            <Dot delay={-200} />
            <Dot delay={-100} />
            <Dot delay={0} />
          </span>
        ) : (
          <div className="leading-relaxed">{renderMessageBody(bodyText)}</div>
        )}
        {profileLabel && <ProfileButton label={profileLabel} />}
        {showClientPicker && (
          <ClientPicker
            onExisting={onPickExistingClient!}
            onNew={onPickNewClient!}
            disabled={pickerDisabled}
          />
        )}
      </div>
    </div>
  );
}

// Memoize so streaming token updates only re-render the bubble whose `message`
// reference actually changed — not the whole conversation history.
export const EmileMessage = memo(EmileMessageInner);

function Avatar() {
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-bg)]">
      <Pencil className="h-3.5 w-3.5 text-[var(--primary)]" />
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
