"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  variant?: "icon" | "full";
  className?: string;
}

export function LogoutButton({ variant = "icon", className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
      // Clear onboarded cookie on logout
      document.cookie = "onboarded=; path=/; max-age=0";
    } catch {
      // proceed regardless
    }
    router.push("/connexion");
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer disabled:opacity-60",
          className
        )}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
        Se déconnecter
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      aria-label="Se déconnecter"
      className={cn(
        "p-2 rounded-xl text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-60",
        className
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
    </button>
  );
}
