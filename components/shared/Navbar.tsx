"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs", href: "#pricing" },
  { label: "Témoignages", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[var(--z-sticky)] bg-white/90 backdrop-blur-sm transition-shadow duration-300",
          isScrolled
            ? "border-b border-[var(--border)] shadow-sm"
            : "border-b border-transparent"
        )}
      >
        <nav className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <Link
              href="/"
              className="flex items-center hover:opacity-90 transition-opacity duration-150 cursor-pointer"
            >
              <Logo variant="horizontal" size={36} />
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors duration-150 cursor-pointer"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/connexion"
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 cursor-pointer"
              >
                Connexion
              </Link>
              <Button href="/inscription" variant="primary" size="sm">
                Démarrer · 14 jours offerts
              </Button>
            </div>

            {/* Mobile burger */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-150 cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-[var(--z-modal)] transition-opacity duration-200",
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!isMenuOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[var(--text-primary)]/30"
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Drawer */}
        <div
          className={cn(
            "absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-xl transition-transform duration-300 ease-out",
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-6 h-[72px] border-b border-[var(--border-light)]">
            <Logo variant="horizontal" size={36} />
            <button
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-150 cursor-pointer"
              aria-label="Fermer le menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex flex-col p-6 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-4 min-h-[48px] text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors duration-150 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-[var(--border-light)] flex flex-col gap-3">
              <Link
                href="/connexion"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-4 min-h-[48px] text-base font-medium text-center text-[var(--text-primary)] border border-[var(--border)] rounded-full hover:bg-[var(--bg-secondary)] transition-colors duration-150 cursor-pointer"
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-4 min-h-[52px] text-base font-semibold text-center text-white bg-[var(--primary)] rounded-full hover:bg-[var(--primary-dark)] shadow-md transition-colors duration-150 cursor-pointer"
              >
                Démarrer · 14 jours offerts
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
