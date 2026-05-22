import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select(
      "id, title, status, related_quote_id, related_client_id, created_at, updated_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: messages, error: msgErr } = await supabase
    .from("messages")
    .select("id, role, content, tool_calls, tool_results, tool_call_id, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return new Response(JSON.stringify({ error: msgErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ conversation, messages: messages ?? [] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

interface PatchBody {
  title?: string;
  status?: "active" | "archived";
  /** Set/unset the conversation's linked client. Used by EmileChat right
   *  after the picker/NewClientModal returns so the bulk-lines route can
   *  inherit the client on the next import without a tool round-trip. */
  related_client_id?: string | null;
  /** Same idea for the linked quote — rarely needed from the client (the
   *  tools already write this on saveQuoteDraft / bulk-lines insert), but
   *  exposed for symmetry. */
  related_quote_id?: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title;
  if (body.status === "active" || body.status === "archived") {
    update.status = body.status;
  }
  // Accept null to explicitly clear the link, a UUID to set it, anything
  // else is silently dropped to avoid a stray "" from a stale form state
  // wiping the FK.
  if ("related_client_id" in body) {
    const v = body.related_client_id;
    if (v === null) update.related_client_id = null;
    else if (typeof v === "string" && UUID_RE.test(v.trim())) {
      update.related_client_id = v.trim();
    }
  }
  if ("related_quote_id" in body) {
    const v = body.related_quote_id;
    if (v === null) update.related_quote_id = null;
    else if (typeof v === "string" && UUID_RE.test(v.trim())) {
      update.related_quote_id = v.trim();
    }
  }
  if (Object.keys(update).length === 0) {
    return new Response(JSON.stringify({ error: "Aucun champ à modifier" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("conversations")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, title, status, related_quote_id, related_client_id, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!data) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ conversation: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
