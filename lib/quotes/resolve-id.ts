import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Quote numbers minted by lib/quotes/numbering.ts look like "QTL-2026-00004".
// We're liberal on the digit suffix (4 to 6 chars) so a future tweak to the
// numbering format doesn't silently break this resolver.
const QUOTE_NUMBER_RE = /^QTL-\d{4}-\d{4,6}$/i;

interface ResolveOptions {
  /** What the LLM (or the caller) passed as `quoteId`. May be a UUID, a
   *  QTL-YYYY-NNNNN number, or `undefined`/`null` when the caller relies on
   *  the conversation link entirely. */
  raw?: string | null;
  /** Conversation in which the tool was invoked. When present, the row's
   *  `related_quote_id` is checked first if `preferConversation` is on. */
  conversationId?: string | null;
  /**
   * When true, the conversation's `related_quote_id` wins over an explicit
   * `raw` id. Recommended for write-and-go tools like `sendQuote` where the
   * user's intent ("envoie le devis") is bound to the active conversation —
   * the LLM occasionally drops the QTL number into the call when it means
   * "the devis we've been editing".
   *
   * Leave false for tools that legitimately target an arbitrary quote
   * (e.g. `getQuoteStatus("le devis de Dupont")` after `listQuotes`).
   */
  preferConversation?: boolean;
}

/**
 * Translate whatever the LLM passed as a quoteId into the canonical UUID
 * that lives in `quotes.id`. Returns null when no quote can be resolved
 * confidently — callers should surface a clear error in that case so Émile
 * can ask the artisan to clarify instead of looping on the same bad id.
 *
 * Resolution order:
 *   1. (optional) `conversations.related_quote_id` for the active conv —
 *      this is the strongest signal because it's set every time a tool
 *      writes to the linked quote.
 *   2. `raw` if it matches the UUID format.
 *   3. `quotes.number` lookup when `raw` matches QTL-YYYY-NNNNN.
 *   4. (fallback) `conversations.related_quote_id` if we hadn't tried it
 *      yet (preferConversation === false but raw didn't pan out).
 */
export async function resolveQuoteId(
  supabase: SupabaseClient,
  userId: string,
  { raw, conversationId, preferConversation = false }: ResolveOptions,
): Promise<string | null> {
  const trimmed = typeof raw === "string" ? raw.trim() : "";

  async function fromConversation(): Promise<string | null> {
    if (!conversationId) return null;
    const { data } = await supabase
      .from("conversations")
      .select("related_quote_id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.related_quote_id as string | null) ?? null;
  }

  async function fromNumber(): Promise<string | null> {
    const { data } = await supabase
      .from("quotes")
      .select("id")
      .eq("number", trimmed)
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.id as string | null) ?? null;
  }

  if (preferConversation) {
    const fromConv = await fromConversation();
    if (fromConv) return fromConv;
  }

  if (trimmed && UUID_RE.test(trimmed)) {
    return trimmed;
  }
  if (trimmed && QUOTE_NUMBER_RE.test(trimmed)) {
    const byNumber = await fromNumber();
    if (byNumber) return byNumber;
  }

  // Last-chance fallback when preferConversation was false but `raw` failed
  // either of the two recognisers — better to silently fall back to the
  // active conversation's quote than to throw "introuvable" while a perfect
  // candidate sits one DB hop away.
  if (!preferConversation) {
    const fromConv = await fromConversation();
    if (fromConv) return fromConv;
  }

  return null;
}
