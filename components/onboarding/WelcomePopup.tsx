"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

function clearWelcomeParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("welcome")) return;
  url.searchParams.delete("welcome");
  const cleaned =
    url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "");
  window.history.replaceState(null, "", cleaned);
}

export function WelcomePopup() {
  const searchParams = useSearchParams();
  const shouldShow = searchParams.get("welcome") === "true";
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!shouldShow) return;
    setOpen(true);
    const enter = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(enter);
  }, [shouldShow]);

  if (!open) return null;

  const dismiss = () => {
    setEntered(false);
    setTimeout(() => {
      setOpen(false);
      clearWelcomeParam();
    }, 200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-popup-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop — clicks are intentionally ignored, only the button dismisses */}
      <div aria-hidden className="absolute inset-0 bg-black/50" />

      <div
        className={`relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl p-8 text-center transition-transform duration-300 ${
          entered ? "scale-100" : "scale-95"
        }`}
      >
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-100 flex items-center justify-center text-3xl leading-none">
          🎉
        </div>

        <h2
          id="welcome-popup-title"
          className="font-display text-[28px] font-medium leading-[1.2] tracking-tight text-[var(--text-primary)] mb-3"
        >
          Bienvenue chez Quovi !
        </h2>

        <p className="text-base text-[var(--text-primary)] font-semibold mb-1.5">
          Votre compte est activé.
        </p>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-7">
          Configurons votre profil pour créer vos premiers devis.
        </p>

        <button
          type="button"
          onClick={dismiss}
          autoFocus
          className="w-full inline-flex items-center justify-center gap-2 h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-full cursor-pointer transition-colors shadow-md"
        >
          Configurer mon profil
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
