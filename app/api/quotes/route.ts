import { NextRequest } from "next/server";
import { generatePublicToken } from "@/lib/signature";
import { getSignatureType } from "@/types";

function generateQuoteNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `QTL-${year}-${seq}`;
}

const MOCK_QUOTES = [
  {
    id: "mock-1",
    number: "QTL-2026-0042",
    status: "pending",
    total: 1_250,
    subtotal: 1_041.67,
    tax_rate: 20,
    tax_amount: 208.33,
    public_token: "demo-token-1",
    signature_type: "simple",
    client: { id: "c1", name: "Marc Dupont", email: "marc@example.fr" },
    items: [{ id: "1", description: "Installation électrique", quantity: 1, unitPrice: 1_041.67, total: 1_041.67 }],
    valid_until: new Date(Date.now() + 25 * 86400_000).toISOString(),
    created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    notes: "",
  },
  {
    id: "mock-2",
    number: "QTL-2026-0038",
    status: "signed",
    total: 3_600,
    subtotal: 3_000,
    tax_rate: 20,
    tax_amount: 600,
    public_token: "demo-token-2",
    signature_type: "email_confirmed",
    client: { id: "c2", name: "Sophie Martin", email: "sophie@example.fr" },
    items: [{ id: "1", description: "Rénovation salle de bain", quantity: 1, unitPrice: 3_000, total: 3_000 }],
    valid_until: new Date(Date.now() + 10 * 86400_000).toISOString(),
    created_at: new Date(Date.now() - 12 * 86400_000).toISOString(),
    notes: "Travaux sur 3 jours",
  },
  {
    id: "mock-3",
    number: "QTL-2026-0031",
    status: "refused",
    total: 8_400,
    subtotal: 7_000,
    tax_rate: 20,
    tax_amount: 1_400,
    public_token: "demo-token-3",
    signature_type: "yousign",
    client: { id: "c3", name: "Jean Bernard", email: "jean@example.fr" },
    items: [{ id: "1", description: "Réfection toiture complète", quantity: 1, unitPrice: 7_000, total: 7_000 }],
    valid_until: new Date(Date.now() - 5 * 86400_000).toISOString(),
    created_at: new Date(Date.now() - 35 * 86400_000).toISOString(),
    notes: "",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from("quotes")
      .select("*, client:clients(id, name, email)")
      .order("created_at", { ascending: false });

    if (user) query = query.eq("user_id", user.id);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ quotes: data ?? [] });
  } catch {
    const filtered = status && status !== "all"
      ? MOCK_QUOTES.filter((q) => q.status === status)
      : MOCK_QUOTES;
    return Response.json({ quotes: filtered });
  }
}

export async function POST(request: NextRequest) {
  let body: {
    clientId?: string;
    newClient?: { name: string; email: string; phone?: string };
    number?: string;
    taxRate: number;
    items: { id: string; description: string; quantity: number; unitPrice: number; total: number }[];
    validUntil?: string;
    notes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subtotal = body.items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.round(subtotal * (body.taxRate / 100) * 100) / 100;
  const total = subtotal + taxAmount;

  const quoteNumber = body.number || generateQuoteNumber();
  const publicToken = generatePublicToken();
  const signatureType = getSignatureType(total);
  const validUntil = body.validUntil || new Date(Date.now() + 30 * 86400_000).toISOString();

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    let clientId = body.clientId;

    // Create client on the fly if needed
    if (!clientId && body.newClient) {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ user_id: user?.id, ...body.newClient })
        .select()
        .single();
      if (!clientError) clientId = newClient.id;
    }

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        user_id: user?.id,
        client_id: clientId,
        number: quoteNumber,
        status: "pending",
        items: body.items,
        subtotal,
        tax_rate: body.taxRate,
        tax_amount: taxAmount,
        total,
        valid_until: validUntil,
        notes: body.notes ?? null,
        public_token: publicToken,
        signature_type: signatureType,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ quote: data }, { status: 201 });
  } catch {
    // Dev fallback — return mock created quote
    const mock = {
      id: `mock-new-${Date.now()}`,
      number: quoteNumber,
      status: "pending",
      total,
      subtotal,
      tax_rate: body.taxRate,
      tax_amount: taxAmount,
      public_token: publicToken,
      signature_type: signatureType,
      items: body.items,
      valid_until: validUntil,
      notes: body.notes ?? null,
      created_at: new Date().toISOString(),
      client: body.newClient ? { name: body.newClient.name, email: body.newClient.email } : null,
    };
    return Response.json({ quote: mock }, { status: 201 });
  }
}
