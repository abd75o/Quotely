/**
 * SIRET helpers — single source of truth for parsing, formatting, and
 * validating French SIRET numbers across input forms, the PDF, and any
 * display surface.
 *
 * Canonical storage = 14 raw digits ("85327106400018"). The formatter only
 * runs at the edges (input field, rendering).
 */

const NON_DIGIT_RE = /\D+/g;

/** Strip everything but digits and cap at 14. Idempotent and safe on null. */
export function siretDigits(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(NON_DIGIT_RE, "").slice(0, 14);
}

/**
 * Format a SIRET as "XXX XXX XXX XXXXX" (3+3+3+5). Accepts partial input so
 * the same function can drive live formatting in an input field — when the
 * user has typed only 5 digits we render "XXX XX" rather than waiting for
 * 14 to start grouping.
 */
export function formatSiret(input: string | null | undefined): string {
  const d = siretDigits(input);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}

/**
 * 14 digits + Luhn checksum. Empty input → true (the field is optional in
 * most places; required-ness is enforced by the caller). Used by every form
 * that takes a SIRET so the error wording stays consistent.
 */
export function isValidSiret(input: string | null | undefined): boolean {
  if (!input) return true;
  const digits = siretDigits(input);
  if (digits.length !== 14) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(digits[i]);
    if (i % 2 === 0) {
      d = d * 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * Standard user-facing error message. Shared so all forms speak the same
 * French and a future copy tweak only needs one edit.
 */
export const SIRET_ERROR_MSG =
  "Le SIRET doit faire 14 chiffres (vérifie la clé de Luhn).";

/**
 * Compute the new caret position after reformatting. The contract:
 *   - `raw` is the value the input currently holds (pre-format, possibly
 *     mid-edit with stray characters).
 *   - `rawCaret` is the caret offset within `raw` (typically
 *     `e.target.selectionStart`).
 *   - returns the offset within `formatSiret(raw)` that sits right AFTER the
 *     same number of digits that preceded the caret in `raw`.
 *
 * This keeps the caret "anchored" to the digit it was next to, so inserting
 * a digit at position 4 doesn't make the cursor jump back to position 0
 * after we re-inject the space.
 */
export function siretCaretAfterFormat(
  raw: string,
  rawCaret: number,
): number {
  // Count the digits that sit to the left of the raw caret. Cap at 14 so a
  // user pasting a 20-digit string lands the caret at the end of the
  // formatted (and truncated) version.
  let digitsBefore = 0;
  const upper = Math.min(rawCaret, raw.length);
  for (let i = 0; i < upper; i++) {
    if (raw.charCodeAt(i) >= 48 && raw.charCodeAt(i) <= 57) digitsBefore++;
    if (digitsBefore >= 14) break;
  }
  if (digitsBefore === 0) return 0;

  const formatted = formatSiret(raw);
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted.charCodeAt(i) >= 48 && formatted.charCodeAt(i) <= 57) {
      count++;
      if (count === digitsBefore) return i + 1;
    }
  }
  return formatted.length;
}
