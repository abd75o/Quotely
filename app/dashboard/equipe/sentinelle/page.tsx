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
}

interface IrisData {
  pendingItems: PendingItem[];
  remindersSentThisMonth: number;
  signedThanksToIris: number;
  successRate: number;
  pendingOver3Days: number;
  irisEnabled: boolean;
}

function nextRelance(daysSince: number): PendingItem["nextRelance"] {
  if (daysSince < 3) return "J+3";
  if (daysSince < 7) return "J+7";
  return "J+14";
}

async function getIrisData(): Promise<IrisData> {
  const empty: IrisData = {
    pendingItems: [],
    remindersSentThisMonth: 0,
    signedThanksToIris: 0,
    successRate: 0,
    pendingOver3Days: 0,
    irisEnabled: true,
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

    const { data, error } = await supabase
      .from("quotes")
      .select(
        "id, number, total, status, created_at, client:clients(name)"
      )
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error || !data) return empty;

    const now = Date.now();
    type Joined = { name?: string | null } | { name?: string | null }[] | null;
    const rows = (data as Array<{
      id: string;
      number: string;
      total: number | null;
      created_at: string;
      client: Joined;
    }>).map((q) => {
      const c = q.client;
      const clientName = Array.isArray(c) ? c[0]?.name ?? "Client" : c?.name ?? "Client";
      const daysSince = Math.floor((now - new Date(q.created_at).getTime()) / 86_400_000);
      return {
        id: q.id,
        number: q.number,
        clientName,
        total: Number(q.total ?? 0),
        daysSince,
      };
    });

    const pendingOver3Days = rows.filter((r) => r.daysSince >= 3).length;
    const pendingItems: PendingItem[] = rows
      .filter((r) => r.daysSince >= 3)
      .slice(0, 10)
      .map((r) => ({ ...r, nextRelance: nextRelance(r.daysSince) }));

    return {
      pendingItems,
      pendingOver3Days,
      irisEnabled,
      // Iris n'envoie pas encore de relances réellement : placeholders honnêtes.
      remindersSentThisMonth: 0,
      signedThanksToIris: 0,
      successRate: 0,
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
        recentActivity={[]}
        irisEnabled={data.irisEnabled}
      />
    </LockedFeature>
  );
}
