"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Google G logo (official colors)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Apple logo
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.7-57.2-155.5-127.4C46 454.2 0 301.5 0 151.4c0-97.2 33.3-197.3 97.4-268.1 64.4-70.9 150.9-116.9 247.3-116.9 91.1 0 164.9 57.2 220.7 57.2 53 0 136.7-59.8 238.1-59.8 37.6 0 152.5 3.2 230.5 113.6Zm-263 -113.6c11.5-57.2 43.4-109 87.7-143.7 39.9-31.2 85.5-50.1 130.3-50.1 1.9 0 3.8 0 5.8.6-11.5 57.8-44 109-88.3 143.7-39.3 30.6-84.8 49.5-129.6 49.5-1.9 0-3.8 0-5.9-.6z" />
    </svg>
  );
}

type Provider = "google" | "apple";

interface Props {
  provider: Provider;
  redirectTo?: string;
}

const CONFIG = {
  google: {
    label: "Continuer avec Google",
    icon: GoogleIcon,
    className: "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300",
  },
  apple: {
    label: "Continuer avec Apple",
    icon: AppleIcon,
    className: "bg-[#1D1D1F] hover:bg-black text-white border-transparent",
  },
};

export function SocialButton({ provider, redirectTo }: Props) {
  const [loading, setLoading] = useState(false);
  const cfg = CONFIG[provider];
  const Icon = cfg.icon;

  async function handleClick() {
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const origin = window.location.origin;
      const callbackUrl = redirectTo
        ? `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        : `${origin}/auth/callback`;

      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl,
          queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
        },
      });
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "relative flex items-center justify-center gap-3 w-full h-12 px-5 text-sm font-semibold rounded-xl border transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-70",
        cfg.className
      )}
      aria-label={cfg.label}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon />
      )}
      {loading ? "Connexion…" : cfg.label}
    </button>
  );
}
