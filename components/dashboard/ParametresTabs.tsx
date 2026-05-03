"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/parametres/entreprise", label: "Mon entreprise", icon: Building2 },
  { href: "/dashboard/parametres/facturation", label: "Facturation", icon: CreditCard },
];

export function ParametresTabs() {
  const pathname = usePathname();
  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      <nav className="inline-flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl whitespace-nowrap">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer",
                active
                  ? "bg-white shadow-sm text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
