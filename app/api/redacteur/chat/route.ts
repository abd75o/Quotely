import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/redacteur/system-prompt";
import {
  TOOL_SCHEMAS,
  TOOLS_BY_NAME,
  type ToolEvent,
  type ToolContext,
} from "@/lib/redacteur/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";
const MAX_TOOL_LOOPS = 6;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  conversationId?: string | null;
  messages?: ClientMessage[];
  userMessage?: string;
}

export async function POST(request: NextRequest) {
  // 1. Auth
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

  // 2. Body
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userMessage = (body.userMessage ?? "").trim();
  if (!userMessage) {
    return new Response(JSON.stringify({ error: "userMessage required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Configuration serveur manquante" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3. Profil pour le system prompt
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "metier, company, company_name, siret, vat_status, vat_number, iban, bic, address, postal_code, city, plan",
    )
    .eq("id", user.id)
    .maybeSingle();

  // 4. Persistance — best effort. Si les tables n'existent pas, on continue.
  let conversationId: string | null = body.conversationId ?? null;
  conversationId = await ensureConversation(
    supabase,
    user.id,
    conversationId,
  );

  if (conversationId) {
    await safeInsert(supabase, "agent_messages", {
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: userMessage,
    });
    await safeUpdate(supabase, "agent_conversations", { id: conversationId }, {
      updated_at: new Date().toISOString(),
    });
  }

  // 5. Build Claude messages from prior history + the new user message.
  const history: Anthropic.MessageParam[] = (body.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content ?? "" }))
    .filter((m) => typeof m.content === "string" && m.content.length > 0);

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const systemPrompt = buildSystemPrompt(profile ?? {});
  const anthropic = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };
      const close = () => {
        controller.close();
      };

      const queuedEmbeds: ToolEvent[] = [];
      const previewEvents: ToolEvent[] = [];
      let assistantText = "";

      const ctx: ToolContext = {
        supabase,
        userId: user.id,
        emit: (event) => {
          if (event.type === "embed") queuedEmbeds.push(event);
          else if (event.type === "preview_open" || event.type === "preview_close")
            previewEvents.push(event);
          else if (event.type === "flash") {
            send({ type: "flash", content: event.content });
          }
        },
      };

      let pendingMessages = messages;
      try {
        for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
          const responseStream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            tools: TOOL_SCHEMAS,
            messages: pendingMessages,
          });

          for await (const ev of responseStream) {
            if (
              ev.type === "content_block_delta" &&
              ev.delta.type === "text_delta"
            ) {
              const chunk = ev.delta.text;
              assistantText += chunk;
              send({ type: "text", text: chunk });
            }
          }
          const final = await responseStream.finalMessage();

          if (final.stop_reason !== "tool_use") {
            // End of conversation turn.
            break;
          }

          const toolUses = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );
          if (toolUses.length === 0) break;

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            const def = TOOLS_BY_NAME[tu.name];
            let resultText: string;
            if (!def) {
              resultText = JSON.stringify({ error: `Outil inconnu: ${tu.name}` });
            } else {
              try {
                resultText = await def.handler(
                  (tu.input ?? {}) as Record<string, unknown>,
                  ctx,
                );
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : "Erreur outil";
                resultText = JSON.stringify({ error: message });
              }
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: resultText,
            });
          }

          // Flush queued UI side-effects between iterations so the client
          // sees them before any further assistant text.
          for (const ev of previewEvents.splice(0)) send(ev);
          for (const ev of queuedEmbeds) send(ev);
          // Keep queuedEmbeds for the final embed-attach (last one wins for
          // the assistant message), but send them progressively too.
          // We do not splice yet — we send only the most recent one as the
          // attached embed at the end of the turn (overwrite OK since the
          // client treats the last embed as the active one).

          pendingMessages = [
            ...pendingMessages,
            { role: "assistant", content: final.content },
            { role: "user", content: toolResults },
          ];
        }

        // Flush any remaining preview events / embeds on final turn.
        for (const ev of previewEvents.splice(0)) send(ev);
        for (const ev of queuedEmbeds.splice(0)) send(ev);

        // Persist the assistant message.
        if (conversationId) {
          await safeInsert(supabase, "agent_messages", {
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: assistantText,
          });
          await safeUpdate(
            supabase,
            "agent_conversations",
            { id: conversationId },
            { updated_at: new Date().toISOString() },
          );
        }

        send({ type: "done", conversationId });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur interne";
        const isDev = process.env.NODE_ENV !== "production";
        send({
          type: "error",
          message: isDev ? message : "Une erreur est survenue, réessaie.",
        });
        console.error("Redacteur chat error:", err);
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// ─── Persistence helpers (no-op if tables missing) ───────────────────────────

type AnySupabase = Awaited<ReturnType<typeof createClient>>;

async function ensureConversation(
  supabase: AnySupabase,
  userId: string,
  existingId: string | null,
): Promise<string | null> {
  if (existingId) {
    const { data, error } = await supabase
      .from("agent_conversations")
      .select("id")
      .eq("id", existingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return null; // table may not exist
    if (data) return existingId;
  }
  const { data, error } = await supabase
    .from("agent_conversations")
    .insert({ user_id: userId, agent_type: "redacteur" })
    .select("id")
    .single();
  if (error || !data) return null;
  return String(data.id);
}

async function safeInsert(
  supabase: AnySupabase,
  table: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from(table).insert(payload);
  } catch {
    /* swallow — persistence is best-effort */
  }
}

async function safeUpdate(
  supabase: AnySupabase,
  table: string,
  match: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    let q = supabase.from(table).update(payload);
    for (const [k, v] of Object.entries(match)) {
      q = q.eq(k, v as string);
    }
    await q;
  } catch {
    /* swallow */
  }
}
