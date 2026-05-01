"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "warm" | "light";

interface HighlightProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

const variants: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: "bg-[#DDE3FF]", text: "text-[var(--primary-dark)]" },
  warm: { bg: "bg-[#FDE68A]", text: "text-[#92400E]" },
  light: { bg: "bg-white/15", text: "text-white" },
};

export function Highlight({ children, variant = "primary", className }: HighlightProps) {
  const v = variants[variant];
  return (
    <span className={cn("relative inline-block px-2 py-0.5 align-baseline", className)}>
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className={cn("absolute inset-0 origin-left rounded-lg", v.bg)}
      />
      <span className={cn("relative", v.text)}>{children}</span>
    </span>
  );
}
