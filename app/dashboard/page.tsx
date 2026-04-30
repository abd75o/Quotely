import Link from "next/link";
import {
  FileText,
  TrendingUp,
  Euro,
  Plus,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Quotely",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalQuotes: number;
  signedQuotes: number;
  revenue: number;
  pendingQuotes: number;
}

interface Quote {
  id: string;
  number: string;
  status: string;
  total: number;
  created_at: string;
  client: { name: string }[] | null;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getDashboardData(): Promise<{ stats: Stats; recentQuotes: Quote[] }> {
  const empty = { stats: { totalQuotes: 0, signedQuotes: 0, revenue: 0, pendingQuotes: 0 }, recentQuotes: [] };
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    const { data: quotes } = await supabase
      .from("quotes")
      .select("id, number, status, total, created_at, client:clients(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!quotes?.length) return empty;

    const allQuotes = quotes as unknown as Quote[];
    const stats: Stats = {
      totalQuotes: allQuotes.length,
      signedQuotes: allQuotes.filter((q) => q.status === "signed" || q.status === "invoiced").length,
      revenue: allQuotes
        .filter((q) => q.status === "signed" || q.status === "invoiced")
        .reduce((sum, q) => sum + (q.total ?? 0), 0),
      pendingQuotes: allQuotes.filter((q) => q.status === "pending").length,
    };

    return { stats, recentQuotes: allQuotes.slice(0, 5) };
  } catch {
    return empty;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "indigo",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: "indigo" | "emerald" | "violet";
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-[var(--text-primary)] leading-none">{value}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending:  { label: "En attente",  icon: Clock,         className: "bg-amber-50 text-amber-700" },
  signed:   { label: "Signé",       icon: CheckCircle2,  className: "bg-emerald-50 text-emerald-700" },
  refused:  { label: "Refusé",      icon: XCircle,       className: "bg-red-50 text-red-700" },
  invoiced: { label: "Facturé",     icon: CheckCircle2,  className: "bg-blue-50 text-blue-700" },
  draft:    { label: "Brouillon",   icon: AlertCircle,   className: "bg-gray-100 text-gray-600" },
};

function QuoteRow({ quote }: { quote: Quote }) {
  const cfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const date = new Date(quote.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const clientName = Array.isArray(quote.client) ? quote.client[0]?.name : quote.client?.name;

  return (
    <Link
      href={`/dashboard/quotes/${quote.id}`}
      className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[var(--primary-bg)] flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-[var(--primary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
