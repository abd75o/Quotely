import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: ReactNode;
  cta?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, cta, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {Icon && (
        <div className="w-14 h-14 bg-[var(--primary-bg)] rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-[var(--primary)]" />
        </div>
      )}
      <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-6">{description}</p>
      )}
      {cta}
    </div>
  );
}
