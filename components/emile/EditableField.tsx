"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Check, X } from "lucide-react";

interface EditableFieldProps {
  value: string | number;
  onSave: (value: string) => void | Promise<void>;
  type?: "text" | "number";
  label?: string;
  width?: string;
  disabled?: boolean;
  debounceMs?: number;
  /** if false, save only on blur (still debounces typing if true) */
  liveDebounce?: boolean;
}

type FeedbackState = "idle" | "saving" | "error";

export function EditableField({
  value,
  onSave,
  type = "text",
  label,
  width,
  disabled = false,
  debounceMs = 500,
  liveDebounce = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
    lastSavedRef.current = String(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const triggerSave = useCallback(
    async (raw: string) => {
      const next = raw.trim();
      if (next.length === 0) {
        setDraft(String(value));
        return;
      }
      if (next === lastSavedRef.current) return;
      setFeedback("saving");
      try {
        await onSave(next);
        lastSavedRef.current = next;
        setFeedback("idle");
        setErrorMessage(null);
        setSavedFeedback(true);
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => {
          setSavedFeedback(false);
        }, 2000);
      } catch (e) {
        setFeedback("error");
        setErrorMessage((e as Error).message ?? "Erreur");
      }
    },
    [onSave, value],
  );

  function scheduleDebounced(raw: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void triggerSave(raw);
    }, debounceMs);
  }

  function commit() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void triggerSave(draft);
    setEditing(false);
  }

  function cancel() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setDraft(String(value));
    setEditing(false);
  }

  const styleHint: CSSProperties | undefined = width ? { width } : undefined;

  if (editing) {
    return (
      <span className="relative inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            if (liveDebounce) scheduleDebounced(v);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          aria-label={label}
          className="rounded border border-[var(--primary)] bg-white px-1.5 py-0.5 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          style={styleHint}
        />
        <FeedbackIcon state={feedback} errorMessage={errorMessage} />
        <SavedOverlay visible={savedFeedback} />
      </span>
    );
  }

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      onClick={() => {
        if (!disabled) setEditing(true);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className={
        disabled
          ? "relative inline-flex items-center gap-1.5 rounded px-1 text-[13px] text-[var(--text-secondary)]"
          : "relative inline-flex cursor-text items-center gap-1.5 rounded px-1 text-[13px] text-[var(--text-primary)] transition-colors hover:bg-[var(--primary-bg)]"
      }
      style={styleHint}
    >
      {!disabled && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--primary)]"
        />
      )}
      <span className="truncate">{value}</span>
      <FeedbackIcon state={feedback} errorMessage={errorMessage} />
      <SavedOverlay visible={savedFeedback} />
    </span>
  );
}

function SavedOverlay({ visible }: { visible: boolean }) {
  return (
    <span
      aria-hidden={!visible}
      className={`pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <Check className="h-3 w-3 text-emerald-600" aria-label="Sauvegardé" />
    </span>
  );
}

function FeedbackIcon({
  state,
  errorMessage,
}: {
  state: FeedbackState;
  errorMessage: string | null;
}) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span
        aria-hidden
        className="h-2 w-2 animate-pulse rounded-full bg-[var(--text-muted)]"
      />
    );
  }
  return (
    <span title={errorMessage ?? "Erreur de sauvegarde"}>
      <X className="h-3 w-3 text-red-600" aria-label="Erreur" />
    </span>
  );
}
