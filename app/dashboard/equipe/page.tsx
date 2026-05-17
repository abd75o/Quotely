import type { Metadata } from "next";
import { Calculator, Eye, PenLine, Wallet } from "lucide-react";
import { AgentCard, type AgentDef } from "@/components/dashboard/AgentCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { type Plan } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon équipe — Quovi",
  robots: { index: false, follow: false },
};

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  comptable: 3,
};

interface EquipeData {
  plan: Plan;
  weeklyQuotes: number;
  /**
   * Devis en attente de signature depuis plus de 3 jours. Le schéma actuel
   * n'a pas de colonne `sent_at`; on considère donc qu'un devis "en attente"
   * (status='pending') créé il y a plus de 3 jours est candidat à la relance.
   * Si une colonne `sent_at` est ajoutée plus tard, basculer le filtre dessus.
   */
  pendingFollowUps: number;
}

async function getEquipeData(): Promise<EquipeData> {
  const fallback: EquipeData = {
    plan: "free",
    weeklyQuotes: 0,
    pendingFollowUps: 0,
  };
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fallback;

    // Plan (pour décider si Iris est verrouillée et si on calcule sa stat).
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    const plan = ((profile?.plan as Plan | null) ?? "free") as Plan;

    // Émile : devis créés cette semaine (lundi 00:00 → maintenant).
    const weekStart = new Date();
    const day = weekStart.getDay();
    const offsetToMonday = (day + 6) % 7;
    weekStart.setDate(weekStart.getDate() - offsetToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const { count: weeklyCount } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekStart.toISOString());

    // Iris : relances en attente — calculées uniquement si l'user a accès.
    let pendingFollowUps = 0;
    if (PLAN_RANK[plan] >= PLAN_RANK.pro) {
      const cutoff = new Date(Date.now() - 3 * 86_400_000).toISOString();
      const { count } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending")
        .is("signed_at", null)
        .lte("created_at", cutoff);
      pendingFollowUps = count ?? 0;
    }

    return {
      plan,
      weeklyQuotes: weeklyCount ?? 0,
      pendingFollowUps,
    };
  } catch (err) {
    console.error("[dashboard/equipe] getEquipeData failed:", err);
    return fallback;
  }
}

function buildAgents(data: EquipeData): AgentDef[] {
  const { weeklyQuotes, pendingFollowUps, plan } = data;
  const isPro = PLAN_RANK[plan] >= PLAN_RANK.pro;

  return [
    {
      id: "emile",
      name: "Émile",
      role: "Le Rédacteur",
      speciality: "Devis",
      description:
        "Tu décris ton chantier, il rédige le devis en 30 secondes avec TVA et mentions légales adaptées.",
      icon: PenLine,
      status: "active",
      href: "/dashboard/emile",
      stats:
        weeklyQuotes > 0
          ? { label: "devis cette semaine", value: weeklyQuotes }
          : { label: "Aucun devis cette semaine", value: "" },
    },
    {
      id: "sentinelle",
      name: "Iris",
      role: "La Sentinelle",
      speciality: "Relances",
      description:
        "Elle surveille tes devis envoyés et relance automatiquement les clients qui n'ont pas répondu.",
      icon: Eye,
      status: "active",
      requiredPlan: "pro",
      href: "/dashboard/equipe/sentinelle",
      stats: isPro
        ? pendingFollowUps > 0
          ? { label: "relances en attente", value: pendingFollowUps }
          : { label: "Tous tes devis sont à jour", value: "" }
        : undefined,
    },
    {
      id: "comptable",
      name: "Théo",
      role: "Le Comptable",
      speciality: "Comptabilité, FEC, TVA",
      description:
        "Il prendra en charge ta comptabilité : déclarations TVA, export FEC pour ton expert-comptable.",
      icon: Calculator,
      status: "coming_soon",
      availableFrom: "octobre 2026",
    },
    {
      id: "tresoriere",
      name: "Léa",
      role: "La Trésorière",
      speciality: "Flux & alertes",
      description:
        "Elle veillera sur ta trésorerie : suivi des encaissements, alertes en cas de baisse anormale.",
      icon: Wallet,
      status: "coming_soon",
      availableFrom: "bientôt",
    },
  ];
}

export default async function EquipePage() {
  const data = await getEquipeData();
  const agents = buildAgents(data);

  const activeCount = agents.filter((a) => a.status === "active").length;
  const comingCount = agents.filter((a) => a.status === "coming_soon").length;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Mon équipe"
        subtitle={`${activeCount} agent${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} · ${comingCount} en préparation`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const isLocked =
            agent.requiredPlan
              ? PLAN_RANK[data.plan] < PLAN_RANK[agent.requiredPlan]
              : false;
          return <AgentCard key={agent.id} agent={agent} isLocked={isLocked} />;
        })}
      </div>
    </div>
  );
}
