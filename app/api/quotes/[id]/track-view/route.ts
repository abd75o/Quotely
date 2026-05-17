import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface TrackBody {
  signature_token: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!body.signature_token) {
    return new Response(
      JSON.stringify({ error: "signature_token required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = await createClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, status, viewed_at, signature_token")
    .eq("id", id)
    .eq("signature_token", body.signature_token)
    .maybeSingle();
  if (error || !quote) {
    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // Update only on first view
  if (!quote.viewed_at) {
    const update: Record<string, unknown> = {
      viewed_at: new Date().toISOString(),
    };
    if (quote.status === "sent") update.status = "viewed";
    await supabase.from("quotes").update(update).eq("id", id);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
