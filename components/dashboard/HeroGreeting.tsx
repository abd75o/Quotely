import { cn } from "@/lib/utils";

interface HeroGreetingProps {
  firstName: string;
  /** Pre-formatted French date — built server-side to avoid hydration drift. */
  todayLabel: string;
  /** Time-of-day subtitle resolved server-side from the same Date instance. */
  subtitle: string;
  className?: string;
}

export function HeroGreeting({
  firstName,
  todayLabel,
  subtitle,
  className,
}: HeroGreetingProps) {
  return (
    <header className={cn("dashboard-card flex flex-col gap-1.5", className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {todayLabel}
      </p>
      <h1 className="font-fraunces text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
        Bonjour {firstName}{" "}
        <span aria-hidden role="img">
          👋
        </span>
      </h1>
      <p className="text-sm text-[var(--text-secondary)] sm:text-base">
        {subtitle}
      </p>
    </header>
  );
}
