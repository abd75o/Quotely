import { cn } from "@/lib/utils";

type Variant = "default" | "alt" | "primary";

interface SectionProps {
  children: React.ReactNode;
  variant?: Variant;
  id?: string;
  className?: string;
  containerClassName?: string;
}

const variants: Record<Variant, string> = {
  default: "bg-[var(--bg-primary)]",
  alt: "bg-[var(--bg-secondary)]",
  primary: "bg-[var(--primary)] text-white",
};

export function Section({
  children,
  variant = "default",
  id,
  className,
  containerClassName,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("py-20 md:py-32", variants[variant], className)}
    >
      <div className={cn("max-w-7xl mx-auto px-6 lg:px-8", containerClassName)}>
        {children}
      </div>
    </section>
  );
}
