"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Users,
  BarChart2,
  Settings,
  Plus,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { TrialBadge } from "@/components/auth/TrialBadge";
import { NewQuoteButton } from "@/components/quotes/NewQuoteButton";
import { ProBadge } from "@/components/ui/ProBadge";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { cn } from "@/lib/utils";

interface NavItemDef {
  label: string;
  icon: React.ElementType;
  href: string;
  /** Si true, l'item est verrouillé pour les Starter (badge PRO + modal au clic). */
  proOnly?: boolean;
}

const NAV: NavItemDef[] = [
  { label: "Devis",                  icon: FileText,  href: "/dashboard/quotes" },
  { label: "Clients",                icon: Users,     href: "/dashboard/clients" },
  { label: "Statistiques avancées",  icon: BarChart2, href: "/dashboard/stats", proOnly: true },
  { label: "Paramètres",             icon: Settings,  href: "/dashboard/parametres" },
];

interface SidebarData {
  email: string;
  initials: string;
  company: string;
  plan: string;
  trialEndsAt: string | null;
}

function useSidebarData(): SidebarData {
  const [data, setData] = useState<SidebarData>({
    email: "",
    initials: "?",
    company: "",
    plan: "trial",
    trialEndsAt: null,
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
          .select("plan, trial_ends_at, company")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (!profile) return;
            setData({
              email,
              initials: (profile.company ?? email).slice(0, 2).toUpperCase(),
              company: profile.company ?? "",
              plan: profile.plan ?? "trial",
              trialEndsAt: profile.trial_ends_at ?? null,
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
  onClick,
  onLockedClick,
}: {
  item: NavItemDef;
  active: boolean;
  locked: boolean;
  onClick?: () => void;
  onLockedClick?: () => void;
}) {
  const baseCls = cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group",
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

  if (locked) {
    return (
      <button
        type="button"
        onClick={() => {
          onClick?.();
          onLockedClick?.();
        }}
        className={cn(baseCls, "w-full text-left")}
      >
        <item.icon className={iconCls} />
        <span className="truncate">{item.label}</span>
        <ProBadge size="sm" withIcon={false} className="ml-auto" />
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={baseCls}
    >
      <item.icon className={iconCls} />
      {item.label}
      {active && <ChevronRight className="w-3 h-3 ml-auto text-[var(--primary)]" />}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { email, initials, company, plan, trialEndsAt } = useSidebarData();
  const { isStarter } = useUserPlan();
  const { showUpgradeModal } = useUpgradeModal();

  async function handleLogout() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "onboarded=; path=/; max-age=0";
    router.push("/connexion");
  }

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
        <NewQuoteButton
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold rounded-xl transition-colors duration-150 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau devis
        </NewQuoteButton>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const locked = !!item.proOnly && isStarter;
          return (
            <NavItem
              key={item.href}
              item={item}
              active={!locked && pathname.startsWith(item.href)}
              locked={locked}
              onClick={onClose}
              onLockedClick={() =>
                showUpgradeModal(
                  "Statistiques avancées",
                  "Graphiques d'évolution du chiffre d'affaires, score de signature et tableaux de bord détaillés.",
                  BarChart2
                )
              }
            />
          );
        })}
      </nav>

      {/* Trial badge (données réelles) */}
      <TrialBadge trialEndsAt={trialEndsAt} plan={plan} />

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group text-left"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {company || email || "Mon compte"}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {plan === "trial" ? "Essai Pro" : plan === "starter" ? "Starter" : "Pro"}
            </p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-red-500 flex-shrink-0 transition-colors" />
        </button>
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
          <Logo variant="horizontal" size={28} id="mobile-header" />
        </Link>

        <NewQuoteButton
          ariaLabel="Nouveau devis"
          className="justify-self-end inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </NewQuoteButton>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[280px] max-w-[85vw] bg-white h-full flex flex-col shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
