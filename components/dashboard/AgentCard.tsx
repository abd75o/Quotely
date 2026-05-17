import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ArrowRight, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentStatus = "active" | "coming_soon";

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  speciality: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  status: AgentStatus;
  availableFrom?: string;
  requiredPlan?: "starter" | "pro" | "comptable";
  href?: string;
  stats?: {
    label: string;
    value: string | number;
    badge?: string;
  };
}

export interface AgentCardProps {
  agent: AgentDef;
  /** Set by the page when the user's plan does not satisfy `agent.requiredPlan`. */
  isLocked?: boolean;
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function StatusBadge({
  status,
  isLocked,
  requiredPlan,
}: {
  status: AgentStatus;
  isLocked: boolean;
  requiredPlan?: AgentDef["requiredPlan"];
}) {
  if (status === "coming_soon") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-2.5 h-2.5" />À venir
      </span>
    );
  }
  if (isLocked) {
    const planLabel =
      requiredPlan === "comptable"
        ? "Comptable"
        : requiredPlan === "starter"
          ? "Starter"
          : "Pro";
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--primary-bg)] text-[var(--primary)] border border-[var(--primary)]/20">
        <Lock className="w-2.5 h-2.5" />
        Plan {planLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Actif
    </span>
  );
}

function CardBody({ agent, isLocked }: { agent: AgentDef; isLocked: boolean }) {
  const Icon = agent.icon;
  const comingSoon = agent.status === "coming_soon";

  return (
    <>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0",
            comingSoon
              ? "bg-[var(--surface-2)] text-[var(--text-muted)]"
              : "bg-[var(--primary-bg)] text-[var(--primary)]"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <StatusBadge
          status={agent.status}
          isLocked={isLocked}
          requiredPlan={agent.requiredPlan}
        />
      </header>

      <h3
        className={cn(
          "font-display tracking-tight",
          comingSoon
            ? "text-lg font-medium text-[var(--text-secondary)]"
            : "text-lg font-extrabold text-[var(--text-primary)]"
        )}
      >
        {agent.name}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
        {agent.role} · {agent.speciality}
      </p>

      <p
        className={cn(
          "text-sm leading-relaxed mt-3",
          comingSoon ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
        )}
      >
        {agent.description}
      </p>

      <footer className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between gap-2 min-h-[28px]">
        {comingSoon ? (
          <span className="text-xs text-[var(--text-muted)]">
            Disponible {agent.availableFrom ?? "bientôt"}
          </span>
        ) : agent.stats ? (
          <span className="text-xs text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-primary)] tabular-nums">
              {agent.stats.value}
            </span>{" "}
            {agent.stats.label}
            {agent.stats.badge && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                {agent.stats.badge}
              </span>
            )}
          </span>
        ) : (
          <span />
        )}
        {!comingSoon && agent.href && (
          <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
        )}
      </footer>
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function AgentCard({ agent, isLocked = false }: AgentCardProps) {
  const comingSoon = agent.status === "coming_soon";

  const cardCls = cn(
    "group flex h-full flex-col rounded-2xl border p-5 transition-all duration-150",
    comingSoon
      ? "bg-[var(--surface)] border-[var(--border-light)] opacity-70 cursor-default"
      : "bg-white border-[var(--border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--text-muted)] cursor-pointer"
  );

  // Coming soon → non-clickable, no link.
  if (comingSoon || !agent.href) {
    return (
      <article className={cardCls} aria-label={agent.name}>
        <CardBody agent={agent} isLocked={isLocked} />
      </article>
    );
  }

  return (
    <Link
      href={agent.href}
      className={cardCls}
      aria-label={
        isLocked ? `${agent.name} — ${agent.role} (verrouillé)` : `${agent.name} — ${agent.role}`
      }
    >
      <CardBody agent={agent} isLocked={isLocked} />
    </Link>
  );
}
