"use client";

import { ChevronDown } from "lucide-react";

interface ScrollIndicatorProps {
  targetId: string;
}

export function ScrollIndicator({ targetId }: ScrollIndicatorProps) {
  const handleClick = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  const inner = (
    <>
      <span className="text-xs uppercase tracking-widest font-semibold">
        Découvrir
      </span>
      <ChevronDown
        size={28}
        className="animate-bounce group-hover:translate-y-1 transition-transform"
        style={{ animationDuration: "2s" }}
      />
    </>
  );

  const baseLook =
    "flex flex-col items-center gap-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors group cursor-pointer motion-reduce:[&_svg]:animate-none";

  return (
    <>
      {/* Mobile : en flow normal sous le mockup */}
      <button
        type="button"
        onClick={handleClick}
        className={`md:hidden mt-12 mb-8 mx-auto ${baseLook}`}
        aria-label="Découvrir comment ça marche"
      >
        {inner}
      </button>

      {/* Desktop : flottant en bas du Hero */}
      <button
        type="button"
        onClick={handleClick}
        className={`hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 [@media(max-height:600px)]:hidden ${baseLook}`}
        aria-label="Découvrir comment ça marche"
      >
        {inner}
      </button>
    </>
  );
}
