import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/iris/toggle — active/désactive Iris pour l'artisan connecté.
// Body : { enabled: boolean }. OFF = le moteur saute ce user (aucune relance).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: { enabled?: unknown };
  try {
    body = (await req.json()) as { enabled?: unknown };
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (typeof body.enabled !== "boolean") {
    return json({ error: "Champ 'enabled' (boolean) requis." }, 400);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ iris_enabled: body.enabled })
    .eq("id", user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, enabled: body.enabled });
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
