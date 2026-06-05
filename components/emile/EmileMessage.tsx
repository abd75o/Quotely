"use client";

import { memo, useState } from "react";
import { Check, Copy, Pencil, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseQuickReplies,
  parseProfileButton,
  parseOpenInvoice,
  hasClientPicker,
} from "./QuickReplies";
import { ProfileButton } from "./ProfileButton";
import { InvoiceButton } from "./InvoiceButton";
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
  /** Re-run the turn that produced this assistant message (action bar). */
  onRegenerate?: (messageId: string) => void;
  /** Replace this user message with new text and re-send (action bar). */
  onEdit?: (messageId: string, newText: string) => void;
}

// System-pill display: drop the [SYSTEM] marker, the raw technical id
// (`id:a003fac0-…`) and any email address, then tidy leftover separators. The
// artisan sees "Client sélectionné : Sophie Martin", never the internal id.
function formatSystemPill(raw: string): string {
  let s = raw.replace(/^\[SYSTEM\]\s*—?\s*/i, "").trim();
  s = s.replace(/\s*[—-]?\s*id\s*:\s*\S+/gi, ""); // drop "id:<uuid>"
  s = s.replace(/\s*[—-]?\s*[^\s—]+@[^\s—]+/g, ""); // drop emails
  s = s
    .replace(/\s*[—-]\s*$/g, "") // trailing separator
    .replace(/\s{2,}/g, " ")
    .trim();
  return s || "…";
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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
  onRegenerate,
  onEdit,
}: EmileMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const text = getText(message);
  const { cleaned, replies } = parseQuickReplies(text);
  const profileLabel = parseProfileButton(text);
  const invoiceId =
    message.role === "assistant" ? parseOpenInvoice(text) : null;
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
    const pillText = isInternalSystem ? formatSystemPill(cleaned) : cleaned;
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
          {pillText || "…"}
        </span>
      </div>
    );
  }

  if (isUser) {
    if (isEditing) {
      const submitEdit = () => {
        const next = draft.trim();
        if (!next) return;
        setIsEditing(false);
        onEdit?.(message.id, next);
      };
      return (
        <div className="flex justify-end">
          <div className="w-full max-w-[80%] rounded-2xl border border-[var(--primary)] bg-white p-2 shadow-sm">
            <textarea
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === "Escape") setIsEditing(false);
              }}
              rows={Math.min(6, Math.max(2, draft.split("\n").length))}
              className="w-full resize-none rounded-lg bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={!draft.trim()}
                className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="group flex flex-col items-end gap-1">
        <div className="emile-bubble-enter-user max-w-[80%] rounded-2xl rounded-br-md bg-[var(--primary)] px-3.5 py-2 text-[13px] text-white shadow-sm whitespace-pre-wrap">
          {cleaned || <span className="opacity-60">…</span>}
        </div>
        <MessageActions time={formatTime(message.createdAt)}>
          {cleaned && <CopyButton getText={() => cleaned} />}
          {onEdit && (
            <ActionButton
              icon={Pencil}
              label="Éditer"
              onClick={() => {
                setDraft(cleaned);
                setIsEditing(true);
              }}
            />
          )}
        </MessageActions>
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
    <div className="group emile-bubble-enter-assistant flex flex-col gap-1">
      <div className="flex items-end gap-2">
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
          {invoiceId && <InvoiceButton invoiceId={invoiceId} />}
          {showClientPicker && (
            <ClientPicker
              onExisting={onPickExistingClient!}
              onNew={onPickNewClient!}
              disabled={pickerDisabled}
            />
          )}
        </div>
      </div>
      {/* Action bar is indented (pl-9) to sit under the bubble, past the avatar.
          Hidden while the bubble is still a thinking placeholder. */}
      {!isThinking && (
        <div className="pl-9">
          <MessageActions time={formatTime(message.createdAt)}>
            {cleaned && <CopyButton getText={() => cleaned} />}
            {onRegenerate && (
              <ActionButton
                icon={RotateCcw}
                label="Régénérer"
                onClick={() => onRegenerate(message.id)}
              />
            )}
          </MessageActions>
        </div>
      )}
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

// Discreet per-message bar: timestamp + actions. Fades in on row hover (or on
// keyboard focus, for a11y). `children` are the role-specific action buttons.
function MessageActions({
  time,
  children,
}: {
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
      {time && (
        <span className="px-1 text-[10px] tabular-nums text-[var(--text-muted)]">
          {time}
        </span>
      )}
      {children}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--primary-bg)] hover:text-[var(--primary)]"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const value = getText();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard can be blocked (no focus / non-secure context) — fail soft,
      // the user can still select the text manually.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copier"
      aria-label="Copier"
      className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--primary-bg)] hover:text-[var(--primary)]"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[11px] font-medium text-emerald-600">
            Copié
          </span>
        </>
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
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
