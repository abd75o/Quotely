import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Single source of truth for auto-titling a conversation. Called from any
 * surface that materially changes the conversation — saveQuoteDraft tool,
 * bulk-lines insert, future imports — so a sensible title is set without
 * waiting on the LLM to do it.
 *
 * Title priority (the FIRST plausible source wins):
 *   1. "Devis {client_name}"            if a client is linked
 *   2. fallbackPrestation                if it doesn't look like a placeholder
 *   3. "Devis {fallbackNumber}"          if we at least have the quote number
 *   4. "Nouvelle conversation"
 *
 * We re-title when the existing title is missing OR matches a placeholder
 * pattern (e.g. "Ligne importée 1 — …", "[SYSTEM] …", "Prestation 3"). Those
 * came from the bulk-import notification flow where Émile would call
 * saveQuoteDraft with synthetic line labels and lock the title in.
 *
 * Truncates at 80 chars to match the previous implementation and the DB
 * column width assumed by the UI list.
 */

const PLACEHOLDER_TITLE_RE =
  /^(?:\s*\[?\s*system\s*\]?\s|ligne[s]?\s+import|prestation\s+\d|devis\s+qtl-)/i;
const PLACEHOLDER_PRESTATION_RE =
  /^(?:ligne[s]?\s+import|prestation\s+\d|\[system\]|nouvelle\s+prestation)/i;

function isPlaceholderTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  const trimmed = title.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_TITLE_RE.test(trimmed);
}

function isPlaceholderPrestation(prestation: string | null | undefined): boolean {
  if (!prestation) return true;
  return PLACEHOLDER_PRESTATION_RE.test(prestation.trim());
}

interface AutoTitleOptions {
  /** Client linked to the quote — preferred title source. */
  clientId?: string | null;
  /** Optional shortcut when the caller already knows the client name (avoids
   *  a round-trip). Used by handlers that just inserted a client. */
  clientLabel?: string | null;
  /** First prestation libellé, used as fallback when no client. */
  fallbackPrestation?: string | null;
  /** Devis number for the last-ditch fallback ("Devis QTL-2026-…"). */
  fallbackNumber?: string | null;
  /**
   * When true, overwrite any existing title even if it doesn't look like a
   * placeholder. Used by the explicit "rename from devis" backfill path.
   */
  force?: boolean;
}

export async function autoTitleConversation(
  supabase: SupabaseClient,
  conversationId: string | null | undefined,
  options: AutoTitleOptions,
): Promise<void> {
  if (!conversationId) return;
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("title, user_id, related_client_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return;

    const existing = (conv.title as string | null | undefined) ?? null;
    if (!options.force && existing && !isPlaceholderTitle(existing)) return;

    // Resolve client label: explicit option > clientId lookup > conversation's
    // own related_client_id. The conversation-level link is the last resort
    // because it's only populated once the client is committed via the picker.
    let clientLabel = options.clientLabel?.trim() ?? "";
    const lookupId =
      options.clientId ??
      (clientLabel ? null : (conv.related_client_id as string | null));
    if (!clientLabel && lookupId) {
      const { data: c } = await supabase
        .from("clients")
        .select("first_name, name")
        .eq("id", lookupId)
        .maybeSingle();
      if (c) {
        const composed = c.first_name
          ? `${c.first_name} ${c.name ?? ""}`.trim()
          : (c.name as string | null);
        clientLabel = (composed ?? "").trim();
      }
    }

    let title: string;
    if (clientLabel) {
      title = `Devis ${clientLabel}`;
    } else if (
      options.fallbackPrestation &&
      !isPlaceholderPrestation(options.fallbackPrestation)
    ) {
      title = options.fallbackPrestation.trim();
    } else if (options.fallbackNumber) {
      title = `Devis ${options.fallbackNumber}`;
    } else {
      title = "Nouvelle conversation";
    }

    await supabase
      .from("conversations")
      .update({ title: title.slice(0, 80) })
      .eq("id", conversationId);
  } catch {
    // best-effort: title generation should never break the calling action
  }
}
