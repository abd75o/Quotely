"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: ReactNode;
  content: string;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden={!visible}
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[min(280px,calc(100vw-32px))] text-center rounded-lg bg-[var(--text-primary)] text-white text-[13px] leading-snug px-3 py-2 shadow-lg transition-opacity duration-150 z-50",
          visible ? "opacity-100" : "opacity-0"
        )}
      >
        {content}
        <span
          aria-hidden
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-[var(--text-primary)]"
        />
      </span>
    </span>
  );
}
