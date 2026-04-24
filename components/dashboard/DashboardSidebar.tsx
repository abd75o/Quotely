"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Users,
  BarChart2,
  Settings,
  Plus,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Devis", icon: FileText, href: "/dashboard/quotes" },
  { label: "Clients", icon: Users, href: "/dashboard/clients" },
  { label: "Statistiques", icon: BarChart2, href: "/dashboard/stats" },
  { label: "Paramètres", icon: Settings, href: "/dashboard/settings" },
];

function NavItem({
  item,
  active,
  onClick,
}: {
  item: (typeof NAV)[0];
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group",
        active
          ? "bg-[var(--primary-bg)] text-[var(--primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-100"
      )}
    >
      <item.icon className={cn("w-4.5 h-4.5 flex-shrink-0", active ? "text-[var(--primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]")} />
      {item.label}
      {active && <ChevronRight className="w-3 h-3 ml-auto text-[var(--primary)]" />}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--border)]">
        <Link href="/dashboard" onClick={onClose} className="cursor-pointer">
          <Logo variant="horizontal" size={28} id="sidebar" />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New quote CTA */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/dashboard/quotes/new"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold rounded-xl transition-colors duration-150 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau devis
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={pathname.startsWith(item.href)}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">Artisan Demo</p>
            <p className="text-xs text-[var(--text-muted)] truncate">Plan Starter</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-[var(--border)] h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[var(--border)] sticky top-0 z-30">
        <Link href="/dashboard">
          <Logo variant="horizontal" size={26} id="mobile-header" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/quotes/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-gray-100 cursor-pointer"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 bg-white h-full flex flex-col shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
