import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClientType = "particulier" | "professionnel";

export interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  siret: string | null;
  type_client: ClientType | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ClientWithStats extends ClientRow {
  quotes_count: number;
  total_signed_revenue: number;
  last_quote_at: string | null;
}

export interface ClientQuoteRow {
  id: string;
  number: string;
  status: string;
  total: number;
  created_at: string;
  signed_at: string | null;
}

// Columns selected from the `clients` table. Use a wide list so any
// extended column added by `20260513_clients_extended.sql` flows through
// automatically. Missing columns are silently null at runtime.
const CLIENT_COLUMNS =
  "id, user_id, name, first_name, email, phone, address, postal_code, city, siret, type_client, tags, notes, created_at, updated_at";

// ─── Read ────────────────────────────────────────────────────────────────────

export async function listClients(
  supabase: SupabaseClient,
  userId: string
): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[clients.listClients]", error.message);
    return [];
  }
  return (data ?? []) as unknown as ClientRow[];
}

export async function listClientsWithStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ClientWithStats[]> {
  const clients = await listClients(supabase, userId);
  if (clients.length === 0) return [];

  const { data: quotes } = await supabase
    .from("quotes")
    .select("client_id, total, status, created_at, signed_at")
    .eq("user_id", userId);

  const map = new Map<
    string,
    { count: number; revenue: number; last: string | null }
  >();
  for (const q of (quotes ?? []) as Array<{
    client_id: string | null;
    total: number | null;
    status: string;
    created_at: string;
    signed_at: string | null;
  }>) {
    if (!q.client_id) continue;
    const entry = map.get(q.client_id) ?? {
      count: 0,
      revenue: 0,
      last: null as string | null,
    };
    entry.count += 1;
    if (q.status === "signed" || q.status === "invoiced") {
      entry.revenue += Number(q.total ?? 0);
    }
    if (!entry.last || new Date(q.created_at) > new Date(entry.last)) {
      entry.last = q.created_at;
    }
    map.set(q.client_id, entry);
  }

  return clients.map((c) => {
    const stats = map.get(c.id);
    return {
      ...c,
      quotes_count: stats?.count ?? 0,
      total_signed_revenue: stats?.revenue ?? 0,
      last_quote_at: stats?.last ?? null,
    };
  });
}

export async function getClient(
  supabase: SupabaseClient,
  userId: string,
  clientId: string
): Promise<ClientRow | null> {
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("user_id", userId)
    .eq("id", clientId)
    .single();
  if (error) {
    console.error("[clients.getClient]", error.message);
    return null;
  }
  return data as unknown as ClientRow;
}

export async function listQuotesForClient(
  supabase: SupabaseClient,
  userId: string,
  clientId: string
): Promise<ClientQuoteRow[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, number, status, total, created_at, signed_at")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[clients.listQuotesForClient]", error.message);
    return [];
  }
  return (data ?? []).map((q) => ({
    ...q,
    total: Number(q.total ?? 0),
  })) as ClientQuoteRow[];
}

// ─── Compute per-client stats from a quote list ──────────────────────────────

export interface ClientPanelStats {
  quotesCount: number;
  signedCount: number;
  revenue: number;
  signatureRate: number; // percent
  avgTimeToSignatureDays: number | null;
  lastQuoteAt: string | null;
}

export function computeClientPanelStats(quotes: ClientQuoteRow[]): ClientPanelStats {
  const signed = quotes.filter((q) => q.status === "signed" || q.status === "invoiced");
  const revenue = signed.reduce((s, q) => s + q.total, 0);
  const signatureRate =
    quotes.length > 0 ? Math.round((signed.length / quotes.length) * 100) : 0;

  const signedWithDelay = signed
    .filter((q) => q.signed_at)
    .map((q) => {
      const diff =
        new Date(q.signed_at as string).getTime() - new Date(q.created_at).getTime();
      return diff / 86_400_000;
    });
  const avgTimeToSignatureDays =
    signedWithDelay.length > 0
      ? Math.round(signedWithDelay.reduce((s, d) => s + d, 0) / signedWithDelay.length)
      : null;

  return {
    quotesCount: quotes.length,
    signedCount: signed.length,
    revenue,
    signatureRate,
    avgTimeToSignatureDays,
    lastQuoteAt: quotes[0]?.created_at ?? null,
  };
}
