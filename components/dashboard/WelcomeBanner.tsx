"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, X, Sparkles } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function WelcomeBanner() {
  const [visible, setVisible] = useState(true);
  const [firstName, setFirstName] = useState("vous");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Remove ?welcome=1 from URL without reload
    if (searchParams.get("welcome") === "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("welcome");
      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(newUrl, { scroll: false });
    }

    // Try to get first name from Supabase
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "";
        if (name) setFirstName(name.split(" ")[0]);
      });
    });
  }, [pathname, router, searchParams]);

  if (!visible) return null;

  return (
    <div className="relative mb-6 p-5 bg-gradient-to-r from-[var(--primary)] to-indigo-700 rounded-2xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fermer"
        className="absolute top-3 right-3 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white mb-0.5">
            Bonjour {firstName}, créez votre premier devis en 30 secondes
          </p>
          <p className="text-sm text-indigo-200">
            Votre essai Pro de 14 jours est actif. Profitez de toutes les fonctionnalités.
          </p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-[var(--primary)] text-sm font-bold rounded-xl hover:bg-gray-50 cursor-pointer transition-colors shadow-md flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Créer mon premier devis
        </Link>
      </div>
    </div>
  );
}
