"use client";

import { Lock } from "lucide-react";

interface LockedFieldProps {
  value: string;
  lockReason: string;
  onClick: (reason: string) => void;
}

export function LockedField({ value, lockReason, onClick }: LockedFieldProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(lockReason)}
      className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-gray-100"
      style={{ cursor: "help" }}
      title={lockReason}
    >
      <Lock className="h-3 w-3 flex-shrink-0 text-[var(--text-muted)]" />
      <span className="truncate">{value}</span>
    </button>
  );
}
