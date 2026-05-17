import type { Metadata } from "next";
import { StatsView } from "@/components/stats/StatsView";
import { calculateUserStats, EMPTY_STATS } from "@/lib/stats/calculations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistiques — Quovi",
  robots: { index: false, follow: false },
};

async function getStats() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return EMPTY_STATS;
    return await calculateUserStats(supabase, user.id);
  } catch (err) {
    console.error("[dashboard/stats] getStats failed:", err);
    return EMPTY_STATS;
  }
}

export default async function StatsPage() {
  const stats = await getStats();
  return <StatsView stats={stats} />;
}
