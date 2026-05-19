import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns the next quote number for a user as a continuous yearly sequence.
 * Format: QTL-YYYY-NNNNN (5-digit zero-padded counter).
 *
 * French tax authorities require quotes to follow a continuous numbering
 * series, so this is a count-based suffix (not a random/timestamp one).
 * Callers should pair this with the UNIQUE(user_id, number) DB constraint
 * (migration 20260519_emile_fixes_batch1.sql) and a retry loop using
 * {@link bumpQuoteNumber} to handle concurrent inserts.
 */
export async function nextQuoteNumber(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QTL-${year}-`;
  const { count } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .like("number", `${prefix}%`);
  const seq = (count ?? 0) + 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

/**
 * Increment the trailing numeric segment of a QTL-YYYY-NNNNN string. Used to
 * retry an insert when a UNIQUE conflict fires on the previous candidate.
 */
export function bumpQuoteNumber(current: string): string {
  const m = /^(.*-)(\d+)$/.exec(current);
  if (!m) return current;
  const next = parseInt(m[2], 10) + 1;
  const width = Math.max(m[2].length, 5);
  return `${m[1]}${String(next).padStart(width, "0")}`;
}
