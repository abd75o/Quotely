"use client";

import { ChevronDown } from "lucide-react";

interface ScrollIndicatorProps {
  targetId: string;
}

export function ScrollIndicator({ targetId }: ScrollIndicatorProps) {
  const handleClick = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors group cursor-pointer [@media(max-height:600px)]:hidden motion-reduce:[&_svg]:animate-none"
      aria-label="Découvrir comment ça marche"
    >
      <span className="text-xs uppercase tracking-widest font-semibold">
        Découvrir
      </span>
      <ChevronDown
        size={28}
        className="animate-bounce group-hover:translate-y-1 transition-transform"
        style={{ animationDuration: "2s" }}
      />
    </button>
  );
}
