import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quote numbering — sequential per user, per year.
 *
 *   Format: QTL-YYYY-NNNNN
 *     - YYYY  : current year (4 digits).
 *     - NNNNN : zero-padded counter, ≥ 5 digits. Naturally extends past 99999
 *       to 6+ digits (bumpQuoteNumber preserves the existing width).
 *
 * French tax law (BOI-TVA-DECLA-30-20-10) requires quote numbers to form a
 * continuous, chronological series — no duplicates, no gaps under normal
 * operation. We satisfy that by:
 *
 *   1. Computing the NEXT number from MAX(existing counter) + 1 (NOT count;
 *      a deleted brouillon used to make count-based numbering collide with
 *      the existing tail when the count dropped).
 *
 *   2. Hardening the INSERT path with the UNIQUE(user_id, number) constraint
 *      added in 20260519_emile_fixes_batch1.sql, paired with a 3-attempt
 *      retry loop on every caller (lib/emile/tools.ts saveQuoteDraft,
 *      app/api/quotes/bulk-lines, app/api/quotes POST). Two concurrent
 *      inserts that race for the same suffix get a 23505, bumpQuoteNumber
 *      shifts by one, retry succeeds.
 *
 * Legacy quotes created with the old random 4-digit generator (e.g.
 * "QTL-2026-3456") stay in the DB as-is. They cannot collide with new
 * sequential numbers because the new format is ≥ 5 digits ("00001" vs
 * "1234" — different strings, different lengths). The MAX scan below
 * filters them OUT so the new series starts cleanly at 00001 per user,
 * per year, regardless of how many random rows pre-date the migration.
 */

const PREFIX = "QTL-";

/**
 * Match the canonical sequential format strictly (≥ 5 trailing digits).
 * Used to discriminate against the legacy random 4-digit format.
 */
const SEQUENTIAL_TAIL_RE = /^QTL-\d{4}-(\d{5,})$/;

/**
 * Returns the next quote number for a user as a continuous per-year series.
 *
 * Per-user (each artisan has their own counter, so user A's first devis
 * is QTL-2026-00001 regardless of how many other artisans exist) and
 * per-year (the counter resets to 1 when YYYY rolls over; old years stay
 * frozen in the DB). The year is derived from the system clock at call
 * time, so writes around midnight on Jan 1 cross the boundary cleanly
 * without an explicit handoff.
 */
export async function nextQuoteNumber(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${PREFIX}${year}-`;

  // We pull every quote number for this user+year matching the prefix —
  // both sequential and legacy random formats — then filter to the
  // sequential format in JS. SQL-side filtering on a regex would work
  // (`number ~ '^QTL-YYYY-\d{5,}$'`) but PostgREST doesn't expose POSIX
  // regex through `or`/`filter` cleanly, and the per-user/year dataset is
  // tiny (~ tens, max a few hundred for a busy artisan over a year), so
  // the difference is academic.
  const { data, error } = await supabase
    .from("quotes")
    .select("number")
    .eq("user_id", userId)
    .like("number", `${prefix}%`);
  if (error) throw error;

  let maxSeq = 0;
  for (const row of (data ?? []) as Array<{ number: string | null }>) {
    if (!row.number) continue;
    const m = SEQUENTIAL_TAIL_RE.exec(row.number);
    if (!m) continue; // skip legacy random 4-digit numbers
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }

  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

/**
 * Increment the trailing numeric segment of a QTL-YYYY-NNNNN string.
 *
 * Used by the retry loop when a UNIQUE conflict fires (two writes
 * computed the same next number, the second loses, bumps by one, and
 * tries again). Preserves the original width so 00007 → 00008 and never
 * shrinks; naturally rolls into 6 digits past 99999 (99999 → 100000).
 */
export function bumpQuoteNumber(current: string): string {
  const m = /^(.*-)(\d+)$/.exec(current);
  if (!m) return current;
  const next = Number.parseInt(m[2], 10) + 1;
  const width = Math.max(m[2].length, 5);
  return `${m[1]}${String(next).padStart(width, "0")}`;
}
