import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { buildEmileSystemPrompt } from "@/lib/emile/system-prompt";
import { createEmileTools } from "@/lib/emile/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";

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
    messages: await convertToModelMessages(trimHistory(messages)),
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

  return result.toUIMessageStreamResponse();
}
