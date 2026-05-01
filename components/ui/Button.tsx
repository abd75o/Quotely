import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "primary-inverted" | "secondary-outline-light";
type Size = "default" | "sm";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  href?: string;
  icon?: boolean;
  children: React.ReactNode;
  className?: string;
}

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2";

const sizes: Record<Size, string> = {
  default: "px-8 py-4 min-h-[52px] text-base",
  sm: "px-5 py-2.5 min-h-[44px] text-sm",
};

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
  secondary:
    "text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--primary)]",
  "primary-inverted":
    "text-[var(--primary)] bg-white hover:bg-[var(--bg-tertiary)] shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
  "secondary-outline-light":
    "text-white bg-transparent border border-white/40 hover:bg-white/10 hover:border-white",
};

export function Button({
  variant = "primary",
  size = "default",
  href,
  icon = false,
  children,
  className,
}: ButtonProps) {
  const classes = cn(base, sizes[size], variants[variant], className);

  const inner = (
    <>
      {children}
      {icon ? (
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }
  return <button className={classes}>{inner}</button>;
}
