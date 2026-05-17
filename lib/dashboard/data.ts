// Server-side aggregator for the dashboard home. One round trip per logical
// dataset, all in parallel — keep this file pure (no React, no client deps) so
// it stays fast and trivially testable.

import { createClient } from "@/lib/supabase/server";

const MONTH_NAMES_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

const WEEKDAY_NAMES_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export type ActivityType =
  | "quote_created"
  | "quote_signed"
  | "quote_refused"
  | "quote_invoiced"
  | "client_created";

export interface StatBlock {
  /** Current-period value (this month for total/signed/pending, summed € for revenue). */
  value: number;
  /**
   * Percentage variation vs previous month. `null` when previous period had 0
   * — showing "+∞%" would be meaningless and misleading.
   */
  deltaPercent: number | null;
  /** 7 daily points, oldest first. Used for the inline sparkline. */
  sparkline: number[];
}

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  /** Already-formatted French label, e.g. "Marc Dubois a signé le devis QTL-2026-0042". */
  label: string;
  /** ISO timestamp; the client renders the relative ago-label. */
  date: string;
  /** Where to navigate when the row is clicked, if anywhere. */
  href?: string;
}

export interface DashboardData {
  firstName: string;
  todayLabel: string;
  greetingSubtitle: string;
  stats: {
    total: StatBlock;
    signed: StatBlock;
    pending: StatBlock;
    revenue: StatBlock;
  };
  revenue6m: Array<{ month: string; value: number }>;
  topClients: Array<{
    id: string;
    name: string;
    quoteCount: number;
    revenue: number;
  }>;
  activity: ActivityEntry[];
}

const EMPTY: DashboardData = {
  firstName: "",
  todayLabel: "",
  greetingSubtitle: "",
  stats: {
    total: { value: 0, deltaPercent: null, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    signed: { value: 0, deltaPercent: null, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    pending: { value: 0, deltaPercent: null, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    revenue: { value: 0, deltaPercent: null, sparkline: [0, 0, 0, 0, 0, 0, 0] },
  },
  revenue6m: [],
  topClients: [],
  activity: [],
};

interface QuoteRow {
  id: string;
  number: string;
  status: string | null;
  total: number | null;
  created_at: string;
  signed_at: string | null;
  refused_at: string | null;
  invoiced_at: string | null;
  client_id: string | null;
  client:
    | { id?: string; name?: string | null; first_name?: string | null }[]
    | { id?: string; name?: string | null; first_name?: string | null }
    | null;
}

interface ClientRow {
  id: string;
  name: string | null;
  first_name: string | null;
  created_at: string;
}

function getClientLabel(row: QuoteRow["client"]): string {
  if (!row) return "Client inconnu";
  const c = Array.isArray(row) ? row[0] : row;
  if (!c) return "Client inconnu";
  const first = (c.first_name ?? "").trim();
  const last = (c.name ?? "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || "Client inconnu";
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function isSigned(q: QuoteRow): boolean {
  return q.status === "signed" || q.status === "invoiced";
}

function isPending(q: QuoteRow): boolean {
  return q.status === "pending";
}

/**
 * Build a 7-bucket array (oldest → newest) where each bucket holds the value
 * extracted by `mapper` for that day. `null` from the mapper means "this row
 * does not count for that day" (used to filter signed/pending rows).
 */
function sparklineFor<T extends { created_at?: string | null; signed_at?: string | null }>(
  rows: T[],
  field: "created_at" | "signed_at",
  mapper: (r: T) => number | null,
): number[] {
  const today = startOfDay(new Date());
  const buckets = new Array(7).fill(0) as number[];
  for (const r of rows) {
    const iso = r[field];
    if (!iso) continue;
    const d = startOfDay(new Date(iso));
    const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (diff < 0 || diff > 6) continue;
    const value = mapper(r);
    if (value === null) continue;
    buckets[6 - diff] += value;
  }
  return buckets;
}

function buildGreeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Belle matinée pour conclure de nouveaux devis";
  if (h < 18) return "Bon retour, prêt à signer un contrat ?";
  return "Bonne soirée, fais un bilan de ta journée";
}

function buildTodayLabel(now: Date): string {
  const weekday = WEEKDAY_NAMES_FR[now.getDay()];
  const day = now.getDate();
  const month = MONTH_NAMES_FR[now.getMonth()];
  const year = now.getFullYear();
  return `${weekday} ${day} ${month} ${year}`;
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return EMPTY;

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
    const sixMonthsAgo = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 5, 1),
    );
    const sevenDaysAgo = startOfDay(
      new Date(now.getTime() - 6 * 86_400_000),
    );

    // Pull EVERYTHING needed for the dashboard in two parallel queries.
    // - `quotesAll`: every quote since 6 months ago (revenue chart, top
    //   clients, monthly/prev-month aggregates, activity feed). 6 months is
    //   the widest window any tile reads — pulling once avoids 4+ round trips.
    // - `clientsRecent`: created clients in the last 30 days for the activity
    //   feed. Top clients are derived from `quotesAll` JOIN.
    // - `profile`: just the first_name for the greeting.
    const [
      { data: quotesRaw },
      { data: clientsRaw },
      { data: profileRaw },
    ] = await Promise.all([
      supabase
        .from("quotes")
        .select(
          "id, number, status, total, created_at, signed_at, refused_at, invoiced_at, client_id, client:clients(id, name, first_name)",
        )
        .eq("user_id", user.id)
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("clients")
        .select("id, name, first_name, created_at")
        .eq("user_id", user.id)
        .gte(
          "created_at",
          new Date(now.getTime() - 30 * 86_400_000).toISOString(),
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const quotes = (quotesRaw ?? []) as unknown as QuoteRow[];
    const clients = (clientsRaw ?? []) as ClientRow[];
    const firstName =
      ((profileRaw as { first_name?: string | null } | null)?.first_name ?? "")
        .trim() || "l'artisan";

    // ── Stats this month vs previous month ─────────────────────────────────
    const thisMonth = quotes.filter(
      (q) => new Date(q.created_at) >= thisMonthStart,
    );
    const prevMonth = quotes.filter((q) => {
      const d = new Date(q.created_at);
      return d >= prevMonthStart && d < thisMonthStart;
    });

    const totalNow = thisMonth.length;
    const totalPrev = prevMonth.length;
    const signedThisMonth = thisMonth.filter(isSigned);
    const signedPrev = prevMonth.filter(isSigned);
    const pendingNow = thisMonth.filter(isPending).length;
    const pendingPrev = prevMonth.filter(isPending).length;
    const revenueNow = signedThisMonth.reduce(
      (s, q) => s + Number(q.total ?? 0),
      0,
    );
    const revenuePrev = signedPrev.reduce(
      (s, q) => s + Number(q.total ?? 0),
      0,
    );

    // Sparklines: only consider the last 7 days. We pre-filter to avoid
    // walking 6 months of rows inside sparklineFor.
    const recent7 = quotes.filter(
      (q) => new Date(q.created_at) >= sevenDaysAgo,
    );
    const sparkTotal = sparklineFor(recent7, "created_at", () => 1);
    const sparkSigned = sparklineFor(
      quotes.filter((q) => q.signed_at && new Date(q.signed_at) >= sevenDaysAgo),
      "signed_at",
      () => 1,
    );
    const sparkPending = sparklineFor(
      recent7.filter(isPending),
      "created_at",
      () => 1,
    );
    const sparkRevenue = sparklineFor(
      quotes.filter(
        (q) =>
          isSigned(q) && q.signed_at && new Date(q.signed_at) >= sevenDaysAgo,
      ),
      "signed_at",
      (q) => Number(q.total ?? 0),
    );

    // ── Revenue last 6 months (signed only) ─────────────────────────────────
    const revenue6m: Array<{ month: string; value: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = MONTH_NAMES_FR[d.getMonth()];
      revenue6m.push({ month: monthLabel, value: 0 });
    }
    for (const q of quotes) {
      if (!isSigned(q)) continue;
      const ref = q.signed_at ?? q.invoiced_at;
      if (!ref) continue;
      const d = new Date(ref);
      const monthsAgo =
        (now.getFullYear() - d.getFullYear()) * 12 +
        (now.getMonth() - d.getMonth());
      if (monthsAgo < 0 || monthsAgo > 5) continue;
      revenue6m[5 - monthsAgo].value += Number(q.total ?? 0);
    }
    for (const b of revenue6m) b.value = Math.round(b.value);

    // ── Top clients by revenue ──────────────────────────────────────────────
    const clientAgg = new Map<
      string,
      { id: string; name: string; quoteCount: number; revenue: number }
    >();
    for (const q of quotes) {
      if (!q.client_id) continue;
      const label = getClientLabel(q.client);
      const existing = clientAgg.get(q.client_id) ?? {
        id: q.client_id,
        name: label,
        quoteCount: 0,
        revenue: 0,
      };
      existing.quoteCount += 1;
      if (isSigned(q)) existing.revenue += Number(q.total ?? 0);
      // Keep the label as soon as we have a real one (some rows may have a
      // null joined client if the row was deleted).
      if (existing.name === "Client inconnu" && label !== "Client inconnu") {
        existing.name = label;
      }
      clientAgg.set(q.client_id, existing);
    }
    const topClients = Array.from(clientAgg.values())
      .sort((a, b) => {
        // Primary: revenue desc. Tiebreaker: quote count desc (so a client
        // with 4 unsigned quotes still beats one with 1 unsigned quote).
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return b.quoteCount - a.quoteCount;
      })
      .slice(0, 5)
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue),
      }));

    // ── Activity feed: union of quote events + client_created ───────────────
    const activity: ActivityEntry[] = [];
    for (const q of quotes) {
      const label = getClientLabel(q.client);
      if (q.signed_at) {
        activity.push({
          id: `q-signed-${q.id}`,
          type: "quote_signed",
          label: `${label} a signé le devis ${q.number}`,
          date: q.signed_at,
          href: `/dashboard/devis/${q.id}`,
        });
      }
      if (q.refused_at) {
        activity.push({
          id: `q-refused-${q.id}`,
          type: "quote_refused",
          label: `${label} a refusé le devis ${q.number}`,
          date: q.refused_at,
          href: `/dashboard/devis/${q.id}`,
        });
      }
      if (q.invoiced_at) {
        activity.push({
          id: `q-invoiced-${q.id}`,
          type: "quote_invoiced",
          label: `Devis ${q.number} facturé`,
          date: q.invoiced_at,
          href: `/dashboard/devis/${q.id}`,
        });
      }
      activity.push({
        id: `q-created-${q.id}`,
        type: "quote_created",
        label: `Devis ${q.number} créé pour ${label}`,
        date: q.created_at,
        href: `/dashboard/devis/${q.id}`,
      });
    }
    for (const c of clients) {
      const label =
        [c.first_name ?? "", c.name ?? ""].filter(Boolean).join(" ").trim() ||
        "Nouveau client";
      activity.push({
        id: `c-created-${c.id}`,
        type: "client_created",
        label: `${label} ajouté à ton carnet`,
        date: c.created_at,
        href: `/dashboard/clients`,
      });
    }
    activity.sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      firstName,
      todayLabel: buildTodayLabel(now),
      greetingSubtitle: buildGreeting(now),
      stats: {
        total: {
          value: totalNow,
          deltaPercent: deltaPercent(totalNow, totalPrev),
          sparkline: sparkTotal,
        },
        signed: {
          value: signedThisMonth.length,
          deltaPercent: deltaPercent(signedThisMonth.length, signedPrev.length),
          sparkline: sparkSigned,
        },
        pending: {
          value: pendingNow,
          deltaPercent: deltaPercent(pendingNow, pendingPrev),
          sparkline: sparkPending,
        },
        revenue: {
          value: Math.round(revenueNow),
          deltaPercent: deltaPercent(revenueNow, revenuePrev),
          sparkline: sparkRevenue,
        },
      },
      revenue6m,
      topClients,
      activity: activity.slice(0, 10),
    };
  } catch (err) {
    console.error("[dashboard/data] failed", err);
    return EMPTY;
  }
}
