import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentColor = "blue" | "violet" | "amber";

export type AgentBadgeTone = "green" | "amber";

export interface AgentBadge {
  label: string;
  tone: AgentBadgeTone;
}

export interface AgentCardProps {
  name: string;
  role: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: AgentColor;
  stats: string;
  href: string;
  badge: AgentBadge;
}

const COLOR_STYLES: Record<AgentColor, { iconBg: string; iconFg: string }> = {
  blue: { iconBg: "bg-[#E6F1FB]", iconFg: "text-[#185FA5]" },
  violet: { iconBg: "bg-[#EEEDFE]", iconFg: "text-[#534AB7]" },
  amber: { iconBg: "bg-[#FAEEDA]", iconFg: "text-[#BA7517]" },
};

const BADGE_STYLES: Record<AgentBadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-[#FAEEDA] text-[#BA7517]",
};

export function AgentCard({
  name,
  role,
  description,
  icon: Icon,
  color,
  stats,
  href,
  badge,
}: AgentCardProps) {
  const colorStyles = COLOR_STYLES[color];

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-[var(--border-light)] bg-white p-4 transition-colors duration-150 hover:border-[var(--text-muted)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            colorStyles.iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", colorStyles.iconFg)} />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            BADGE_STYLES[badge.tone],
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              badge.tone === "green" ? "bg-emerald-500" : "bg-[#BA7517]",
            )}
          />
          {badge.label}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {name}
        </h3>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{role}</p>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border-light)] pt-3">
        <span className="text-xs text-[var(--text-muted)]">{stats}</span>
        <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
      </div>
    </Link>
  );
}
