"use client";

import { UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientPickerProps {
  onExisting: () => void;
  onNew: () => void;
  /**
   * `true` once the artisan has already picked an option for this prompt — the
   * buttons are hidden so the answer can't be changed by clicking a stale
   * bubble after the conversation has moved on.
   */
  disabled?: boolean;
}

export function ClientPicker({ onExisting, onNew, disabled }: ClientPickerProps) {
  if (disabled) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <PickerButton
        icon={Users}
        label="Client existant"
        onClick={onExisting}
        variant="secondary"
      />
      <PickerButton
        icon={UserPlus}
        label="Nouveau client"
        onClick={onNew}
        variant="primary"
      />
    </div>
  );
}

function PickerButton({
  icon: Icon,
  label,
  onClick,
  variant,
}: {
  icon: typeof Users;
  label: string;
  onClick: () => void;
  variant: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        variant === "primary"
          ? "bg-[var(--primary)] text-white hover:opacity-90"
          : "border border-[var(--border)] bg-white text-[var(--text-primary)] hover:bg-[var(--surface)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
