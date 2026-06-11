import type { Metadata } from "next";
import { LockedFeature } from "@/components/shared/LockedFeature";
import { IrisDashboard } from "@/components/iris/IrisDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iris — Quovi",
  robots: { index: false, follow: false },
};

interface PendingItem {
  id: string;
  number: string;
  clientName: string;
  total: number;
  daysSince: number;
  nextRelance: "J+3" | "J+7" | "J+14";
  pageViewedAt: string | null;
}

interface ActivityItem {
  id: string;
  date: string;
  message: string;
}

interface IrisData {
  pendingItems: PendingItem[];
  remindersSentThisMonth: number;
  signedThanksToIris: number;
  successRate: number;
  pendingOver3Days: number;
  irisEnabled: boolean;
  recentActivity: ActivityItem[];
}

const STAGE_LABEL: Record<string, PendingItem["nextRelance"]> = {
  j3: "J+3",
  j7: "J+7",
  j14: "J+14",
};

// Prochain palier à envoyer = premier des trois non encore tracé. null si Iris
// a déjà tout envoyé (j3+j7+j14) → le devis n'est plus « surveillé ».
function nextRelanceFor(
  sentStages: Set<string>,
): PendingItem["nextRelance"] | null {
  if (!sentStages.has("j3")) return "J+3";
  if (!sentStages.has("j7")) return "J+7";
  if (!sentStages.has("j14")) return "J+14";
  return null;
}

function joinedName(c: unknown): string {
  const obj = Array.isArray(c) ? c[0] : c;
  return ((obj as { name?: string | null } | null)?.name ?? "Client").trim() || "Client";
}

async function getIrisData(): Promise<IrisData> {
  const empty: IrisData = {
    pendingItems: [],
    remindersSentThisMonth: 0,
    signedThanksToIris: 0,
    successRate: 0,
    pendingOver3Days: 0,
    irisEnabled: true,
    recentActivity: [],
  };
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;

    const { data: profile } = await supabase
      .from("profiles")
      .select("iris_enabled")
      .eq("id", user.id)
      .maybeSingle();
    const irisEnabled =
      (profile as { iris_enabled?: boolean } | null)?.iris_enabled ?? true;

    const now = Date.now();

    // ── Relances réellement envoyées (trace quote_reminders) ────────────────
    const { data: reminders } = await supabase
      .from("quote_reminders")
      .select(
        "id, quote_id, stage, sent_at, quote:quotes(number, client:clients(name))",
      )
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false });
    const remRows = (reminders ?? []) as Array<{
      id: string;
      quote_id: string;
      stage: string;
      sent_at: string;
      quote: unknown;
    }>;

    // Paliers déjà envoyés par devis (pour calculer la prochaine relance).
    const stagesByQuote = new Map<string, Set<string>>();
    for (const r of remRows) {
      const set = stagesByQuote.get(r.quote_id) ?? new Set<string>();
      set.add(r.stage);
      stagesByQuote.set(r.quote_id, set);
    }

    // Stat « relances ce mois ».
    const d = new Date(now);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const remindersSentThisMonth = remRows.filter(
      (r) => new Date(r.sent_at).getTime() >= monthStart,
    ).length;

    // Stats « signés via Iris » / « taux de réussite ».
    const quoteIdsWithReminder = [...stagesByQuote.keys()];
    let signedThanksToIris = 0;
    if (quoteIdsWithReminder.length > 0) {
      const { count } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "signed")
        .in("id", quoteIdsWithReminder);
      signedThanksToIris = count ?? 0;
    }
    const successRate =
      quoteIdsWithReminder.length > 0
        ? Math.round((signedThanksToIris / quoteIdsWithReminder.length) * 100)
        : 0;

    // Historique (10 dernières relances).
    const recentActivity: ActivityItem[] = remRows.slice(0, 10).map((r) => {
      const q = (Array.isArray(r.quote) ? r.quote[0] : r.quote) as
        | { number?: string; client?: unknown }
        | null;
      const number = q?.number ?? "—";
      const clientName = joinedName(q?.client);
      const date = new Date(r.sent_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
      return {
        id: r.id,
        date,
        message: `Relance ${STAGE_LABEL[r.stage] ?? r.stage} envoyée à ${clientName} — devis ${number}`,
      };
    });

    // ── Devis surveillés : envoyés non signés (sent/viewed) ─────────────────
    const { data: quotes } = await supabase
      .from("quotes")
      .select(
        "id, number, total, status, sent_at, page_viewed_at, client:clients(name)",
      )
      .eq("user_id", user.id)
      .in("status", ["sent", "viewed"])
      .order("sent_at", { ascending: true });
    const qRows = (quotes ?? []) as Array<{
      id: string;
      number: string;
      total: number | null;
      sent_at: string | null;
      page_viewed_at: string | null;
      client: unknown;
    }>;

    const enriched = qRows
      .filter((q) => q.sent_at)
      .map((q) => {
        const daysSince = Math.floor(
          (now - new Date(q.sent_at as string).getTime()) / 86_400_000,
        );
        return {
          id: q.id,
          number: q.number,
          clientName: joinedName(q.client),
          total: Number(q.total ?? 0),
          daysSince,
          pageViewedAt: q.page_viewed_at,
          next: nextRelanceFor(stagesByQuote.get(q.id) ?? new Set()),
        };
      });

    const pendingOver3Days = enriched.filter((r) => r.daysSince >= 3).length;
    // On surveille les devis qui ont encore un palier à venir.
    const pendingItems: PendingItem[] = enriched
      .filter((r) => r.next !== null)
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        number: r.number,
        clientName: r.clientName,
        total: r.total,
        daysSince: r.daysSince,
        nextRelance: r.next as PendingItem["nextRelance"],
        pageViewedAt: r.pageViewedAt,
      }));

    return {
      pendingItems,
      pendingOver3Days,
      irisEnabled,
      remindersSentThisMonth,
      signedThanksToIris,
      successRate,
      recentActivity,
    };
  } catch (err) {
    console.error("[dashboard/sentinelle] getIrisData failed:", err);
    return empty;
  }
}

export default async function SentinellePage() {
  const data = await getIrisData();

  const teaserDescription = `Tu as actuellement ${data.pendingOver3Days} devis en attente depuis plus de 3 jours. Iris peut les relancer automatiquement pour toi (J+3 · J+7 · J+14) — avec une moyenne de 35% de devis signés en plus grâce aux relances.`;

  return (
    <LockedFeature
      feature="canUseIris"
      requiredPlan="pro"
      variant="overlay"
      teaser={{
        title: "Iris pourrait t'aider",
        description:
          data.pendingOver3Days > 0
            ? teaserDescription
            : "Iris surveille tes devis envoyés et te prévient quand relancer. Plus jamais un client oublié.",
        stats: [
          { label: "En attente > 3j", value: data.pendingOver3Days },
          { label: "Gain moyen", value: "+35%" },
          { label: "Auto", value: "24/7" },
        ],
      }}
    >
      <IrisDashboard
        pendingItems={data.pendingItems}
        remindersSentThisMonth={data.remindersSentThisMonth}
        signedThanksToIris={data.signedThanksToIris}
        successRate={data.successRate}
        recentActivity={data.recentActivity}
        irisEnabled={data.irisEnabled}
      />
    </LockedFeature>
  );
}
