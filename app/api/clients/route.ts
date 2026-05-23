import { NextRequest } from "next/server";
import { titleCaseFr } from "@/lib/format/title-case";

// Same write-time normalisation as /api/profile so a client typed
// "jean lefebre" / "paris" appears capitalised everywhere it's read.
function titleCaseField(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  return titleCaseFr(trimmed);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("clients")
      .select("id, name, first_name, email, phone")
      .order("name")
      .eq("user_id", user.id);

    if (q) query = query.ilike("name", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ clients: data ?? [] });
  } catch (err) {
    console.error("[api/clients] GET failed:", err);
    return Response.json(
      { error: "Failed to load clients" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: { name: string; email: string; phone?: string; address?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || !body.email) {
    return Response.json({ error: "name and email required" }, { status: 400 });
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply title-case to name fields + city so the row lands in the DB
    // with consistent casing whatever the artisan typed. We mutate a
    // shallow copy rather than the request body to keep the rejection
    // log readable if the insert fails.
    const normalisedBody: Record<string, unknown> = { ...body };
    for (const field of ["name", "first_name", "city"]) {
      if (field in normalisedBody) {
        normalisedBody[field] = titleCaseField(normalisedBody[field]);
      }
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({ user_id: user.id, ...normalisedBody })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ client: data }, { status: 201 });
  } catch (err) {
    console.error("[api/clients] POST failed:", err);
    return Response.json(
      { error: "Failed to create client" },
      { status: 500 },
    );
  }
}
