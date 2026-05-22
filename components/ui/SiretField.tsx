"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
} from "react";
import { TextField } from "./Field";
import {
  formatSiret,
  siretCaretAfterFormat,
} from "@/lib/format/siret";

/**
 * Drop-in SIRET input: live-formats user typing as "XXX XXX XXX XXXXX" and
 * keeps the caret anchored to the digit it was sitting next to (otherwise
 * the cursor jumps to the start on every keystroke once we re-insert
 * spaces).
 *
 * Storage contract: the parent owns the raw value (formatted string) and
 * receives the formatted string via `onValueChange`. The caller should
 * strip spaces before persisting — `siretDigits(form.siret)` returns the
 * canonical 14-digit form.
 */
interface SiretFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type"
  > {
  label?: string;
  hint?: string;
  error?: string;
  value: string;
  onValueChange: (formatted: string) => void;
}

export function SiretField({
  value,
  onValueChange,
  label,
  hint,
  error,
  id,
  // Most callers pass `placeholder="14 chiffres"` etc. — surface a sensible
  // default so a forgotten prop doesn't leave the field naked.
  placeholder = "853 271 064 00018",
  maxLength = 17,
  inputMode = "numeric",
  ...rest
}: SiretFieldProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  // useLayoutEffect needs to know where to drop the caret AFTER React commits
  // the new formatted value. We can't call setSelectionRange synchronously
  // inside onChange — the input's `value` prop hasn't been re-applied yet.
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (
      pendingCaret.current != null &&
      el &&
      typeof document !== "undefined" &&
      document.activeElement === el
    ) {
      const pos = pendingCaret.current;
      pendingCaret.current = null;
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        // Some input types throw on setSelectionRange in odd states; the
        // alternative is a one-frame caret jump, which we'd rather swallow.
      }
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const rawCaret = e.target.selectionStart ?? raw.length;
      pendingCaret.current = siretCaretAfterFormat(raw, rawCaret);
      onValueChange(formatSiret(raw));
    },
    [onValueChange],
  );

  return (
    <TextField
      ref={ref}
      id={id}
      label={label}
      hint={hint}
      error={error}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      // autocomplete="off" — browsers offer "national-id" suggestions that
      // mangle the formatted display on autofill.
      autoComplete="off"
      {...rest}
    />
  );
}
