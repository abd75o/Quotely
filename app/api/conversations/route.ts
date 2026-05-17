import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
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

  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id, title, status, related_quote_id, related_client_id, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ conversations: data ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

interface CreateBody {
  title?: string;
  related_quote_id?: string;
  related_client_id?: string;
}

export async function POST(req: NextRequest) {
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

  let body: CreateBody = {};
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    // body vide = OK, on crée une conversation vierge
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      title: body.title ?? null,
      status: "active",
      related_quote_id: body.related_quote_id ?? null,
      related_client_id: body.related_client_id ?? null,
    })
    .select(
      "id, title, status, related_quote_id, related_client_id, created_at, updated_at",
    )
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ conversation: data }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
