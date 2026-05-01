import { cn } from "@/lib/utils";

type Variant = "default" | "alt" | "primary";
type Size = "default" | "wide";

interface SectionProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  id?: string;
  className?: string;
  containerClassName?: string;
  decoration?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  default: "bg-[var(--bg-primary)]",
  alt: "bg-[var(--bg-secondary)]",
  primary: "bg-[var(--primary)] text-white",
};

const sizes: Record<Size, string> = {
  default: "max-w-[1440px]",
  wide: "max-w-[1600px]",
};

export function Section({
  children,
  variant = "default",
  size = "default",
  id,
  className,
  containerClassName,
  decoration,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative isolate overflow-hidden py-16 md:py-24",
        variants[variant],
        className
      )}
    >
      {decoration}
      <div
        className={cn(
          "relative mx-auto px-6 lg:px-8",
          sizes[size],
          containerClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
