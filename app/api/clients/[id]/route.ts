import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CLIENT_COLUMNS =
  "id, name, first_name, email, phone, address, postal_code, city, type_client, siret, notes";

interface ClientUpdateBody {
  name?: string | null;
  first_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  type_client?: "particulier" | "professionnel" | null;
  siret?: string | null;
}

/**
 * GET /api/clients/[id] — fetch a single client owned by the current user.
 * Used by the chat to pre-fill the edit modal when sendQuote refuses on
 * missing required fields.
 */
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
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Client introuvable." }, { status: 404 });
  }
  return Response.json({ client: data });
}

/**
 * PUT /api/clients/[id] — replace the editable subset of a client row.
 * No DB constraint on address/CP/ville so existing rows that pre-date the
 * legal-conformity push keep working; validation lives in the modal +
 * sendQuote so only NEW or RE-SAVED clients are forced to be complete.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ClientUpdateBody;
  try {
    body = (await req.json()) as ClientUpdateBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Whitelist explicitly so a stray `user_id` / `id` in the body can't
  // hijack ownership or rewrite the PK.
  const patch: Record<string, unknown> = {};
  for (const key of [
    "name",
    "first_name",
    "email",
    "phone",
    "address",
    "postal_code",
    "city",
    "type_client",
    "siret",
  ] as const) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(CLIENT_COLUMNS)
    .maybeSingle();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Client introuvable." }, { status: 404 });
  }
  return Response.json({ client: data });
}
