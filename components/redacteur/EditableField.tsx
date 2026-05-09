"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

interface EditableFieldProps {
  value: string | number;
  onSave: (value: string) => void;
  type?: "text" | "number";
  label?: string;
  width?: string;
  disabled?: boolean;
}

export function EditableField({
  value,
  onSave,
  type = "text",
  label,
  width,
  disabled = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (next.length === 0) {
      setDraft(String(value));
      setEditing(false);
      return;
    }
    if (next !== String(value)) onSave(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(String(value));
    setEditing(false);
  }

  const styleHint: CSSProperties | undefined = width ? { width } : undefined;

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
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
        className="rounded border border-[#534AB7] bg-white px-1.5 py-0.5 text-[13px] outline-none focus:ring-2 focus:ring-[#534AB7]/30"
        style={styleHint}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      onDoubleClick={() => {
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
          ? "inline-flex items-center gap-1.5 rounded px-1 text-[13px] text-[var(--text-secondary)]"
          : "inline-flex cursor-text items-center gap-1.5 rounded px-1 text-[13px] text-[var(--text-primary)] transition-colors hover:bg-[rgba(99,153,34,0.10)]"
      }
      style={styleHint}
    >
      {!disabled && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#639922]"
        />
      )}
      <span className="truncate">{value}</span>
    </span>
  );
}
