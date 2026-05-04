import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "Dashboard — Quovi",
};

interface RawQuote {
  id: string;
  number: string;
  status: string;
  total: number | null;
  created_at: string;
  signed_at: string | null;
  invoiced_at: string | null;
  client: { name: string }[] | { name: string } | null;
}

export interface DashboardStats {
  totalQuotes: number;
  signedQuotes: number;
  pendingQuotes: number;
  revenue: number;
  signatureRate: number;
}

export interface DashboardQuote {
  id: string;
  number: string;
  status: string;
  total: number;
  created_at: string;
  client_name: string;
}

const EMPTY_STATS: DashboardStats = {
  totalQuotes: 0,
  signedQuotes: 0,
  pendingQuotes: 0,
  revenue: 0,
  signatureRate: 0,
};

function getClientName(client: RawQuote["client"]): string {
  if (!client) return "Client inconnu";
  if (Array.isArray(client)) return client[0]?.name ?? "Client inconnu";
  return client.name ?? "Client inconnu";
}

async function getDashboardData(): Promise<{
  stats: DashboardStats;
  recentQuotes: DashboardQuote[];
}> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { stats: EMPTY_STATS, recentQuotes: [] };

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [{ data: monthQuotes }, { data: latest }] = await Promise.all([
      supabase
        .from("quotes")
        .select("id, number, status, total, created_at, signed_at, invoiced_at, client:clients(name)")
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .limit(500),
      supabase
        .from("quotes")
        .select("id, number, status, total, created_at, signed_at, invoiced_at, client:clients(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const month = (monthQuotes ?? []) as unknown as RawQuote[];
    const recent = (latest ?? []) as unknown as RawQuote[];

    const signed = month.filter((q) => q.status === "signed" || q.status === "invoiced");
    const pending = month.filter((q) => q.status === "pending");
    const revenue = signed.reduce((s, q) => s + Number(q.total ?? 0), 0);

    const stats: DashboardStats = {
      totalQuotes: month.length,
      signedQuotes: signed.length,
      pendingQuotes: pending.length,
      revenue,
      signatureRate: month.length > 0 ? Math.round((signed.length / month.length) * 100) : 0,
    };

    const recentQuotes: DashboardQuote[] = recent.map((q) => ({
      id: q.id,
      number: q.number,
      status: q.status,
      total: Number(q.total ?? 0),
      created_at: q.created_at,
      client_name: getClientName(q.client),
    }));

    return { stats, recentQuotes };
  } catch {
    return { stats: EMPTY_STATS, recentQuotes: [] };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const { stats, recentQuotes } = await getDashboardData();

  return (
    <DashboardHome
      stats={stats}
      recentQuotes={recentQuotes}
      welcome={welcome === "1"}
    />
  );
}
