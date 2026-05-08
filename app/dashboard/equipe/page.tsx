import type { Metadata } from "next";
import { Eye, MessageCircle, Pencil } from "lucide-react";
import { AgentCard, type AgentCardProps } from "@/components/dashboard/AgentCard";

export const metadata: Metadata = {
  title: "Mon équipe — Quovi",
};

async function getWeeklyQuoteCount(): Promise<number> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekAgo.toISOString());

    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function EquipePage() {
  const weeklyQuotes = await getWeeklyQuoteCount();
  const pendingAlerts = 3;
  const pendingFollowUps = 12;
  const weeklyConversations = 23;

  const agents: AgentCardProps[] = [
    {
      name: "L'Assistant",
      role: "Support général",
      description:
        "Répond à tes questions, t'aide à naviguer dans Quovi, te fait gagner du temps sur l'admin.",
      icon: MessageCircle,
      color: "blue",
      stats: `${weeklyConversations} conversations cette semaine`,
      href: "/dashboard/equipe/assistant",
      badge: { label: "Actif", tone: "green" },
    },
    {
      name: "Le Rédacteur",
      role: "Génération de devis",
      description:
        "Tu décris ton chantier, il rédige un devis pro en 30 secondes. Tarifs marché 2026 inclus.",
      icon: Pencil,
      color: "violet",
      stats:
        weeklyQuotes > 0
          ? `${weeklyQuotes} devis cette semaine`
          : "Aucun devis cette semaine",
      href: "/dashboard/equipe/redacteur",
      badge: { label: "Actif", tone: "green" },
    },
    {
      name: "La Sentinelle",
      role: "Suivi & relances",
      description:
        "Surveille tes devis envoyés, te prévient quand relancer. Plus jamais un client oublié.",
      icon: Eye,
      color: "amber",
      stats: `${pendingFollowUps} relances en attente`,
      href: "/dashboard/equipe/sentinelle",
      badge:
        pendingAlerts > 0
          ? { label: `${pendingAlerts} alertes`, tone: "amber" }
          : { label: "Actif", tone: "green" },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 border-b border-[var(--border-light)] pb-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Dashboard / Équipe
        </p>
        <h1 className="mt-2 text-2xl font-medium text-[var(--text-primary)]">
          Mon équipe
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          3 collaborateurs disponibles 24/7 pour faire tourner ton activité.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.href} {...agent} />
        ))}
      </div>
    </div>
  );
}
