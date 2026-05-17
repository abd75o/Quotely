import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyRevenuePoint {
  month: string; // YYYY-MM
  label: string; // short FR label e.g. "mai"
  revenue: number;
  quotesCount: number;
}

export interface TopClient {
  clientId: string;
  name: string;
  totalRevenue: number;
  quotesCount: number;
}

export interface TopPrestation {
  label: string;
  count: number;
  avgPrice: number;
}

export interface Insight {
  icon: string; // emoji
  label: string;
  value: string;
}

export interface UserStats {
  totalRevenueSigned: number;
  totalQuotesCreated: number;
  totalQuotesSigned: number;
  signatureRate: number; // percent
  totalActiveClients: number; // clients with at least 1 quote
  avgTimeToSignatureDays: number | null;
  avgDelayBeforeSendingDays: number | null;
  monthlyRevenue12Months: MonthlyRevenuePoint[];
  topClients: TopClient[];
  topPrestations: TopPrestation[];
  insights: Insight[];
  /** Devis en attente depuis plus de 3 jours (utilisé par le teaser Iris). */
  pendingOver3Days: number;
}

export const EMPTY_STATS: UserStats = {
  totalRevenueSigned: 0,
  totalQuotesCreated: 0,
  totalQuotesSigned: 0,
  signatureRate: 0,
  totalActiveClients: 0,
  avgTimeToSignatureDays: null,
  avgDelayBeforeSendingDays: null,
  monthlyRevenue12Months: [],
  topClients: [],
  topPrestations: [],
  insights: [],
  pendingOver3Days: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface RawQuote {
  id: string;
  client_id: string | null;
  status: string;
  total: number | null;
  created_at: string;
  signed_at: string | null;
  invoiced_at: string | null;
  items: unknown;
  client?: { name?: string | null } | { name?: string | null }[] | null;
}

interface QuoteItem {
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | string | null;
  total?: number | string | null;
}

function clientNameFromJoin(client: RawQuote["client"]): string | null {
  if (!client) return null;
  if (Array.isArray(client)) return client[0]?.name ?? null;
  return client.name ?? null;
}

function buildMonthlyBuckets(): MonthlyRevenuePoint[] {
  const now = new Date();
  const buckets: MonthlyRevenuePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      revenue: 0,
      quotesCount: 0,
    });
  }
  return buckets;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function calculateUserStats(
  supabase: SupabaseClient,
  userId: string
): Promise<UserStats> {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, client_id, status, total, created_at, signed_at, invoiced_at, items, client:clients(name)"
    )
    .eq("user_id", userId);

  if (error || !data) {
    console.error("[stats.calculateUserStats]", error?.message);
    return EMPTY_STATS;
  }

  const quotes = data as unknown as RawQuote[];
  if (quotes.length === 0) return EMPTY_STATS;

  // ── Totals
  const signed = quotes.filter((q) => q.status === "signed" || q.status === "invoiced");
  const totalRevenueSigned = signed.reduce((s, q) => s + Number(q.total ?? 0), 0);
  const signatureRate =
    quotes.length > 0 ? Math.round((signed.length / quotes.length) * 100) : 0;

  const activeClientIds = new Set<string>();
  for (const q of quotes) if (q.client_id) activeClientIds.add(q.client_id);

  // ── Average time to signature
  const signedWithDelay = signed
    .filter((q) => q.signed_at)
    .map(
      (q) =>
        (new Date(q.signed_at as string).getTime() - new Date(q.created_at).getTime()) /
        86_400_000
    );
  const avgTimeToSignatureDays =
    signedWithDelay.length > 0
      ? Math.round(signedWithDelay.reduce((s, d) => s + d, 0) / signedWithDelay.length)
      : null;

  // ── Monthly revenue (12 months)
  const buckets = buildMonthlyBuckets();
  const bucketByKey = new Map(buckets.map((b) => [b.month, b]));
  for (const q of quotes) {
    const ref = q.signed_at ?? q.invoiced_at;
    if (!ref) continue;
    const d = new Date(ref);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = bucketByKey.get(key);
    if (!b) continue;
    b.revenue += Number(q.total ?? 0);
    b.quotesCount += 1;
  }
  const monthlyRevenue12Months = buckets.map((b) => ({
    ...b,
    revenue: Math.round(b.revenue),
  }));

  // ── Top clients (by signed revenue)
  const clientMap = new Map<
    string,
    { name: string; revenue: number; count: number }
  >();
  for (const q of quotes) {
    if (!q.client_id) continue;
    const entry = clientMap.get(q.client_id) ?? {
      name: clientNameFromJoin(q.client) ?? "Client",
      revenue: 0,
      count: 0,
    };
    entry.count += 1;
    if (q.status === "signed" || q.status === "invoiced") {
      entry.revenue += Number(q.total ?? 0);
    }
    if (!entry.name || entry.name === "Client") {
      entry.name = clientNameFromJoin(q.client) ?? entry.name;
    }
    clientMap.set(q.client_id, entry);
  }
  const topClients: TopClient[] = [...clientMap.entries()]
    .map(([clientId, v]) => ({
      clientId,
      name: v.name,
      totalRevenue: Math.round(v.revenue),
      quotesCount: v.count,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  // ── Top prestations (from items JSON)
  const prestationMap = new Map<string, { count: number; totalUnitPrice: number; samples: number }>();
  for (const q of quotes) {
    const items: QuoteItem[] = Array.isArray(q.items) ? (q.items as QuoteItem[]) : [];
    for (const it of items) {
      const label = (it.description ?? "").trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const entry = prestationMap.get(key) ?? { count: 0, totalUnitPrice: 0, samples: 0 };
      const qty = Number(it.quantity ?? 0);
      const unit = Number(it.unitPrice ?? 0);
      entry.count += qty || 1;
      if (unit > 0) {
        entry.totalUnitPrice += unit;
        entry.samples += 1;
      }
      prestationMap.set(key, entry);
    }
  }
  const topPrestations: TopPrestation[] = [...prestationMap.entries()]
    .map(([key, v]) => {
      // Capitalise first letter for display
      const display = key.charAt(0).toUpperCase() + key.slice(1);
      return {
        label: display,
        count: v.count,
        avgPrice: v.samples > 0 ? Math.round(v.totalUnitPrice / v.samples) : 0,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Insights
  const insights: Insight[] = [];
  // Best day of week for signatures
  if (signed.length >= 3) {
    const dayCounts = new Array(7).fill(0);
    for (const q of signed) {
      if (q.signed_at) dayCounts[new Date(q.signed_at).getDay()] += 1;
    }
    const max = Math.max(...dayCounts);
    if (max > 0) {
      const bestDay = dayCounts.indexOf(max);
      const pct = Math.round((max / signed.length) * 100);
      const dayLabels = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
      insights.push({
        icon: "📅",
        label: `Tu signes le plus souvent le ${dayLabels[bestDay]}`,
        value: `${pct}% des signatures`,
      });
    }
  }
  // Small-quote signature rate
  if (quotes.length >= 5) {
    const small = quotes.filter((q) => Number(q.total ?? 0) < 1500);
    if (small.length > 0) {
      const smallSigned = small.filter(
        (q) => q.status === "signed" || q.status === "invoiced"
      );
      const rate = Math.round((smallSigned.length / small.length) * 100);
      insights.push({
        icon: "💶",
        label: "Tes devis < 1 500 €",
        value: `${rate}% signés`,
      });
    }
  }
  // Average delay
  if (avgTimeToSignatureDays !== null) {
    insights.push({
      icon: "⏱️",
      label: "Délai moyen de signature",
      value: `${avgTimeToSignatureDays} jour${avgTimeToSignatureDays > 1 ? "s" : ""}`,
    });
  }

  // ── Pending > 3 days (for Iris teaser)
  const cutoff = Date.now() - 3 * 86_400_000;
  const pendingOver3Days = quotes.filter(
    (q) => q.status === "pending" && new Date(q.created_at).getTime() < cutoff
  ).length;

  return {
    totalRevenueSigned: Math.round(totalRevenueSigned),
    totalQuotesCreated: quotes.length,
    totalQuotesSigned: signed.length,
    signatureRate,
    totalActiveClients: activeClientIds.size,
    avgTimeToSignatureDays,
    avgDelayBeforeSendingDays: null, // requires a `sent_at` column we don't have yet
    monthlyRevenue12Months,
    topClients,
    topPrestations,
    insights,
    pendingOver3Days,
  };
}
