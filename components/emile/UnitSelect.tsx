"use client";

import { quoteUnitsWithCurrent } from "@/lib/quotes/units";

interface UnitSelectProps {
  /** Current stored unit (may be a legacy value not in the canonical list). */
  value: string | null;
  /** Fires the new value as soon as the artisan picks one — no commit/blur. */
  onChange: (next: string | null) => void;
  /** Locked once the quote is sent/viewed/signed, matches the rest of the
   *  inline editors. */
  disabled?: boolean;
}

/**
 * Compact inline dropdown for the "unité" cell in the quote line preview.
 *
 * Why a custom small select rather than the shared SelectField: the line row
 * already commits to ~70px wide and uses a different visual density than the
 * settings form; this stays consistent with the EditableField sibling cells.
 *
 * Legacy units (e.g. "pcs", "tomettes") that pre-date the canonical list are
 * kept in the dropdown via quoteUnitsWithCurrent() so the artisan editing an
 * old quote doesn't lose data on first interaction.
 */
export function UnitSelect({ value, onChange, disabled }: UnitSelectProps) {
  const options = quoteUnitsWithCurrent(value);
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      disabled={disabled}
      aria-label="Unité"
      className="rounded border border-[var(--border)] bg-white px-1.5 py-0.5 text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:bg-transparent disabled:text-[var(--text-secondary)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
