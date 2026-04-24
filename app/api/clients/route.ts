import { NextRequest } from "next/server";

const MOCK_CLIENTS = [
  { id: "c1", name: "Marc Dupont", email: "marc.dupont@example.fr", phone: "06 12 34 56 78" },
  { id: "c2", name: "Sophie Martin", email: "sophie.martin@example.fr", phone: "06 98 76 54 32" },
  { id: "c3", name: "Jean Bernard", email: "jean.bernard@example.fr", phone: "07 11 22 33 44" },
  { id: "c4", name: "Isabelle Moreau", email: "i.moreau@example.fr", phone: "06 55 44 33 22" },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from("clients")
      .select("id, name, email, phone")
      .order("name");

    if (user) query = query.eq("user_id", user.id);
    if (q) query = query.ilike("name", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ clients: data ?? [] });
  } catch {
    const filtered = q
      ? MOCK_CLIENTS.filter((c) => c.name.toLowerCase().includes(q))
      : MOCK_CLIENTS;
    return Response.json({ clients: filtered });
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

    const { data, error } = await supabase
      .from("clients")
      .insert({ user_id: user?.id, ...body })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ client: data }, { status: 201 });
  } catch {
    return Response.json({
      client: { id: `mock-${Date.now()}`, ...body },
    }, { status: 201 });
  }
}
