"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Receipt,
  Users,
  UserCircle2,
  BarChart2,
  Settings,
  LayoutDashboard,
  Lock,
  Plus,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Gift,
} from "lucide-react";
import { QuoviLogo } from "@/components/shared/QuoviLogo";
import { NewQuoteButton } from "@/components/quotes/NewQuoteButton";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { getPlanFeatures, type Plan } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface NavItemDef {
  label: string;
  icon: React.ElementType;
  href: string;
  /** Si true, l'item est verrouillé pour les Starter (badge PRO + modal au clic). */
  proOnly?: boolean;
}

const NAV: NavItemDef[] = [
  { label: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Mon équipe",      icon: Users,           href: "/dashboard/equipe" },
  { label: "Devis",           icon: FileText,        href: "/dashboard/devis" },
  { label: "Factures",        icon: Receipt,         href: "/dashboard/factures" },
  { label: "Clients",         icon: UserCircle2,     href: "/dashboard/clients" },
  { label: "Statistiques",    icon: BarChart2,       href: "/dashboard/stats", proOnly: true },
  { label: "Parrainage",      icon: Gift,            href: "/dashboard/parrainage" },
  { label: "Paramètres",      icon: Settings,        href: "/dashboard/parametres" },
];

const EMILE_PATH = "/dashboard/emile";

interface SidebarData {
  email: string;
  initials: string;
  company: string;
}

function useSidebarData(): SidebarData {
  const [data, setData] = useState<SidebarData>({
    email: "",
    initials: "?",
    company: "",
  });

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        const email = user.email ?? "";
        const initials = email.slice(0, 2).toUpperCase();
        setData((prev) => ({ ...prev, email, initials }));

        supabase
          .from("profiles")
          .select("company")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (!profile) return;
            setData({
              email,
              initials: (profile.company ?? email).slice(0, 2).toUpperCase(),
              company: profile.company ?? "",
            });
          });
      });
    });
  }, []);

  return data;
}

function NavItem({
  item,
  active,
  locked,
  collapsed,
  onClick,
}: {
  item: NavItemDef;
  active: boolean;
  locked: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const baseCls = cn(
    "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer",
    collapsed
      ? "h-10 w-10 justify-center mx-auto"
      : "gap-3 px-3 py-2.5",
    active
      ? "bg-[var(--primary-bg)] text-[var(--primary)]"
      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-100"
  );
  const iconCls = cn(
    "w-4 h-4 flex-shrink-0",
    active
      ? "text-[var(--primary)]"
      : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
  );

  const tooltip = collapsed ? (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {item.label}
      {locked && " · Pro"}
    </span>
  ) : null;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={baseCls}
      aria-label={locked ? `${item.label} — fonctionnalité Pro` : item.label}
    >
      <item.icon className={iconCls} />
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {!collapsed && locked && (
        <Lock
          className="w-3 h-3 text-[var(--text-muted)] ml-auto"
          aria-hidden
        />
      )}
      {!collapsed && !locked && active && (
        <ChevronRight className="w-3 h-3 ml-auto text-[var(--primary)]" />
      )}
      {tooltip}
    </Link>
  );
}

function SidebarContent({
  collapsed,
  onToggle,
  onClose,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { email, initials, company } = useSidebarData();
  const { isPro, plan } = useUserPlan();
  const resolvedPlan: Plan = plan ?? "free";
  const planLabel = `Plan ${getPlanFeatures(resolvedPlan).label}`;

  async function handleLogout() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "onboarded=; path=/; max-age=0";
    router.push("/connexion");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo + bouton fermer (mobile) ou toggle (desktop) */}
      <div
        className={cn(
          "flex border-b border-[var(--border)] py-5",
          collapsed
            ? "flex-col items-center gap-3 px-2"
            : "items-center justify-between px-4"
        )}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          className="cursor-pointer"
          aria-label="Quovi"
        >
          {/* Static — re-mounts on every dashboard route change, never
              animate so the user doesn't see the logo "respawn". */}
          <QuoviLogo size={32} iconOnly={collapsed} />
        </Link>
        {onClose ? (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        ) : onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
            title={collapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        ) : null}
      </div>

      {/* New quote CTA */}
      <div className={cn("pt-4 pb-2", collapsed ? "px-2" : "px-4")}>
        <NewQuoteButton
          onClick={onClose}
          ariaLabel="Nouveau devis"
          className={cn(
            "flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold rounded-xl transition-colors duration-150 cursor-pointer shadow-sm",
            collapsed
              ? "h-10 w-10 mx-auto"
              : "gap-2 w-full py-2.5"
          )}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && "Nouveau devis"}
        </NewQuoteButton>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          "flex-1 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden",
          collapsed ? "px-2" : "px-3"
        )}
      >
        {NAV.map((item) => {
          const locked = !!item.proOnly && !isPro;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <NavItem
              key={item.href}
              item={item}
              active={isActive}
              locked={locked}
              collapsed={collapsed}
              onClick={onClose}
            />
          );
        })}
      </nav>

      {/* User info + logout */}
      <div
        className={cn(
          "border-t border-[var(--border)] py-4",
          collapsed ? "px-2" : "px-4"
        )}
      >
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "group flex items-center rounded-xl hover:bg-gray-50 cursor-pointer transition-colors text-left",
            collapsed
              ? "h-10 w-10 mx-auto justify-center p-0 relative"
              : "w-full gap-3 p-2.5"
          )}
          aria-label="Se déconnecter"
          title={collapsed ? "Se déconnecter" : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {company || email || "Mon compte"}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 mt-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    resolvedPlan === "pro" || resolvedPlan === "comptable"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      : resolvedPlan === "starter"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-gray-100 text-[var(--text-secondary)] border border-[var(--border)]"
                  )}
                >
                  {planLabel}
                </span>
              </div>
              <LogOut className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-red-500 flex-shrink-0 transition-colors" />
            </>
          )}
          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Se déconnecter
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const isEmile = pathname.startsWith(EMILE_PATH);
  const [collapsed, setCollapsed] = useState<boolean>(isEmile);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-collapse en entrant sur Émile, auto-expand en sortant.
  // L'utilisateur peut toggle librement tant qu'il reste sur la même section.
  useEffect(() => {
    setCollapsed(isEmile);
  }, [isEmile]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-white border-r border-[var(--border)] h-screen sticky top-0 flex-shrink-0 transition-[width] duration-300 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* Mobile top bar — burger | logo centré | + */}
      <header className="lg:hidden grid grid-cols-3 items-center h-14 px-2 bg-white border-b border-[var(--border)] sticky top-0 z-30">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="justify-self-start inline-flex items-center justify-center w-11 h-11 rounded-xl text-[var(--text-primary)] hover:bg-gray-100 cursor-pointer transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link href="/dashboard" className="justify-self-center cursor-pointer" aria-label="Tableau de bord">
          <QuoviLogo size={28} />
        </Link>

        <NewQuoteButton
          ariaLabel="Nouveau devis"
          className="justify-self-end inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </NewQuoteButton>
      </header>

      {/* Mobile drawer — toujours en mode étendu (le drawer a sa propre largeur) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[280px] max-w-[85vw] bg-white h-full flex flex-col shadow-2xl">
            <SidebarContent
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
