import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { buildEmileSystemPrompt } from "@/lib/emile/system-prompt";
import { createEmileTools } from "@/lib/emile/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

// Sonnet 4.6 measured ~40% faster time-to-first-token than 4.5 on Émile's
// ~11k-token cached prefix, same quality for devis drafting. Prompt caching
// works identically on it (verified).
const MODEL = "claude-sonnet-4-6";

interface RequestBody {
  messages: UIMessage[];
  conversationId?: string | null;
}

// Cap the history sent to Anthropic. Sonnet 4.5 tolerates 200k context, but we
// trim aggressively to stay well under the practical budget once tool inputs
// and outputs are inlined. Slicing the last N items preserves intra-turn
// tool-call/result pairs because each UIMessage holds them together in its
// `parts` array — we only need to make sure the window doesn't START on an
// orphan assistant/tool message that would dangle without its triggering user
// turn.
const MAX_HISTORY = 20;

function trimHistory(msgs: UIMessage[]): UIMessage[] {
  if (msgs.length <= MAX_HISTORY) return msgs;
  let trimmed = msgs.slice(-MAX_HISTORY);
  while (trimmed.length > 0 && trimmed[0].role !== "user") {
    trimmed = trimmed.slice(1);
  }
  return trimmed;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY manquante" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, conversationId } = body;
  const conversationIdSafe = conversationId ?? null;

  // Narrow SELECT to the columns buildEmileSystemPrompt actually reads — every
  // unused column adds tens of ms to the round-trip before the first token.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, metier_principal, metier, specialites, city, company_name, company, vat_status, tva_status, toggle_price_memory, toggle_suggestions",
    )
    .eq("id", user.id)
    .maybeSingle();

  const p = (profile ?? {}) as Record<string, unknown>;

  const systemPrompt = buildEmileSystemPrompt({
    prenom: (p.first_name as string) || "l'artisan",
    metier_principal:
      (p.metier_principal as string) || (p.metier as string) || "artisan",
    specialites: (p.specialites as string[]) ?? [],
    ville: (p.city as string) || undefined,
    nom_entreprise:
      (p.company_name as string) || (p.company as string) || undefined,
    statut_tva: (p.vat_status as string) || (p.tva_status as string) || undefined,
    toggle_price_memory: Boolean(p.toggle_price_memory ?? false),
    toggle_suggestions: Boolean(p.toggle_suggestions ?? false),
  });

  if (conversationIdSafe && Array.isArray(messages) && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last?.role === "user") {
      const textParts = Array.isArray(last.parts)
        ? last.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { type: "text"; text: string }).text)
            .join("\n")
        : "";
      if (textParts) {
        // Fire-and-forget: persisting the user message must NOT delay the
        // first-token round trip. The conversation history we send to the
        // model comes from the request body, not the DB, so the LLM has the
        // message even if this insert hasn't landed yet.
        void supabase
          .from("messages")
          .insert({
            conversation_id: conversationIdSafe,
            role: "user",
            content: textParts,
          })
          .then(({ error }) => {
            if (error) console.error("[emile] user-msg persist failed", error);
          });
      }
    }
  }

  const tools = createEmileTools({
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    conversationId: conversationIdSafe,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin,
  });

  // PROMPT CACHING — tools breakpoint.
  // Anthropic orders the prompt prefix as [tools, system, messages]. The
  // cacheControl on the system block (below) already caches everything before
  // it, tools included. We ALSO mark the last tool so the tools block is its
  // own cache breakpoint: this makes the ~11k-token static prefix (tools +
  // system) explicitly cacheable and resilient if the per-artisan system text
  // changes while the tool set stays identical. Verified end-to-end: warm
  // turns read ~11.2k cached input tokens instead of re-billing them.
  const toolKeys = Object.keys(tools);
  const lastToolKey = toolKeys[toolKeys.length - 1];
  if (lastToolKey) {
    const mutableTools = tools as Record<string, Record<string, unknown>>;
    mutableTools[lastToolKey] = {
      ...mutableTools[lastToolKey],
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    };
  }

  // PROMPT CACHING — conversation breakpoint.
  // Cache the conversation turns so each new message re-reads the prior history
  // from cache instead of re-prefilling all of it. Anthropic caches everything
  // up to and including the marked (last) message; next turn appends a new
  // message and still hits this prefix. Short chats fall below the min-cache
  // threshold and simply skip it (no harm). 3rd breakpoint — system + tools are
  // the other two; Anthropic allows up to 4.
  const modelMessages = await convertToModelMessages(trimHistory(messages));
  const lastModelMessage = modelMessages[modelMessages.length - 1];
  if (lastModelMessage) {
    lastModelMessage.providerOptions = {
      anthropic: { cacheControl: { type: "ephemeral" } },
    };
  }

  const result = streamText({
    model: anthropic(MODEL),
    // SystemModelMessage form (not the plain `string` form) so we can attach
    // Anthropic-specific providerOptions. `cacheControl: ephemeral` marks the
    // 530-line prompt for the Prompt Caching feature — Anthropic returns a
    // cached_prompt_token count on subsequent calls and bills those at ~10%
    // of normal input cost. The ephemeral cache lives ~5min, plenty for a
    // sustained chat session.
    system: {
      role: "system",
      content: systemPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
    messages: modelMessages,
    tools,
    // 12 leaves room for legitimate multi-tool turns: checkProfileCompleteness
    // → refreshProfile → findClient → calculateTVA → getUserPastPrices →
    // saveQuoteDraft → final text. Bumping from 8 also covers the "MODE 2"
    // case where Émile extracts prestations from a natural-language client
    // brief in a single user message.
    stopWhen: stepCountIs(12),
    // Slightly lower than 0.7 → marginally faster sampling and tighter,
    // less rambly French. Still warm enough for natural phrasing.
    temperature: 0.6,
    // AI SDK v6 renames `maxTokens` → `maxOutputTokens` (same semantics).
    maxOutputTokens: 2048,
    onFinish: async ({ text, toolCalls, toolResults }) => {
      if (!conversationIdSafe) return;
      try {
        const hasCalls = Array.isArray(toolCalls) && toolCalls.length > 0;
        const hasResults =
          Array.isArray(toolResults) && toolResults.length > 0;
        // Persist whenever the turn produced text OR tool activity — a turn
        // that only ran tools (e.g. saveQuoteDraft followed by no text) must
        // still survive a refresh, otherwise the assistant loses memory of
        // what was executed and can repeat it on the next turn.
        if (text || hasCalls) {
          await supabase.from("messages").insert({
            conversation_id: conversationIdSafe,
            role: "assistant",
            content: text || null,
            tool_calls: hasCalls ? toolCalls : null,
            tool_results: hasResults ? toolResults : null,
          });
        }
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationIdSafe);
      } catch {
        // best-effort
      }
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      // Disable proxy/CDN response buffering (Netlify, nginx) so each SSE chunk
      // is flushed to the browser the instant it's produced instead of being
      // held back — keeps the first token and the token-by-token "typing" feel
      // snappy in production. No effect on `next dev` locally.
      "X-Accel-Buffering": "no",
    },
  });
}
